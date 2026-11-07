---
title: "用 systemd --user 跑常驻服务：五次被杀之后学到的"
date: 2026-10-30
tags: [Linux, systemd, 运维]
---

一个自建服务，跑在一台 WSL2 机器上，用 systemd 用户级单元托管。看着挺正规：`Restart=on-failure`、`MemoryMax` 都设了，`systemctl --user status` 一切正常。

然后某天它连续被强杀五次，每次都死得不明不白——`is-active` 显示 active，日志里只有一行 `Main process exited, code=killed, status=9/KILL`。

把当天的日志摊开看，才发现这些坑都藏在"看起来已经配好了"的地方。下面按踩到的顺序讲。

---

## 一、`TimeoutStopSec` 超时，正在干的活直接没了

日志实录：

```
12:00:41 Stopping pi-agent-web.service...
12:01:26 pi-agent-web.service: State 'stop-sigterm' timed out. Killing.
12:01:26 Killing process 873670 (node-MainThread) with signal SIGKILL.
12:01:26 Main process exited, code=killed, status=9/KILL
```

45 秒到了，进程没退，systemd 直接 `SIGKILL`。

问题不在 45 秒短，在于**应用侧什么都没做**。发一个 `SIGTERM` 过去，Node 默认行为不是"优雅退出"，而是继续跑——如果事件循环里有 pending 的 Promise（比如一个正在进行的模型请求、一次 40 秒的上下文压缩），进程不会自己停。

那 45 秒里它在干嘛？日志能对上：一次分块摘要从 12:03:43 开始、12:04:23 结束，耗时 40 秒。重启正好落在上一轮压缩中间。

**改法两条**：
- 应用侧挂 `process.on('SIGTERM')`，收到就开始拒绝新请求、等手上的活收尾、然后 `process.exit(0)`。这一步不做，`TimeoutStopSec` 设多大都是赌。
- `TimeoutStopSec` 按"最长的不可打断操作"来定，不是按"应该很快退"来定。我的压缩要 40 秒，设 45 秒只剩 5 秒余量，一次网络慢就超。

---

## 二、`systemctl restart` 会杀掉正在执行它的那个 shell

这个坑最反直觉。我通过 SSH 远程跑 `systemctl --user restart pi-agent-web`，结果**命令没有返回**，连接的会话直接断了。

原因：systemd 用户级单元默认在同一个 cgroup 里。你这个 shell 是作为该用户会话的一部分启动的，`restart` 触发 stop 阶段时，systemd 会清理该单元的整个 cgroup——执行重启的那条命令本身也在里面，于是它把自己杀了。

表现出来就是"重启好像没成功"：命令无输出、会话断开。实际重启是成功的，只是没人看到结果。

**改法**：把重启动作和终端解耦。

```bash
nohup setsid bash -c 'sleep 2; systemctl --user restart my-service' >/dev/null 2>&1 &
```

`sleep 2` 让当前命令先返回，`setsid` 换新会话脱离父进程组。之后再单独去查状态，别指望那条命令给你回执。

更彻底的做法是用 `systemd-run`：

```bash
systemd-run --user --on-active=2 --unit=restart-myservice systemctl --user restart my-service
```

---

## 三、`is-active` 会骗人

`systemctl --user is-active my-service` 返回 `active`，不代表你连的进程是对的。

我排查"改了代码为什么没生效"时才发现：服务确实 active，但 `MainPID` 还是几小时前的那个，`ExecMainStartTimestamp` 也停在老时间——意思是**重启根本没发生**，而 `is-active` 一如既往地返回 active。

判断一个服务到底跑的是不是最新构建，要三个一起看：

```bash
systemctl --user show my-service -p ActiveState -p MainPID -p ExecMainStartTimestamp
```

再加一条实际探测（HTTP 健康检查、端口监听），才是完整证据。只看 `is-active`，等于只看"有个进程叫这个名字"。

---

## 四、定时重启会打断业务，而业务不知道

我给这个服务配了每两小时整点重启的 timer（早期是为了绕开内存缓慢上涨）。配置很标准：

```ini
[Timer]
OnCalendar=*-*-* 00/2:00:00
Unit=my-service-restart.service
```

问题在于：**timer 只看时钟，不看你在干什么**。整点整分，它就开始 stop 流程，不管此刻是否有一轮对话正在跑、是否有一个长任务写到一半。

于是就有了第一条里那次 `SIGKILL`：12:00:41 开始停，12:01:26 超时强杀，一个跑到一半的压缩任务直接消失，用户侧看到的是"回复没了"。

**改法（按代价从低到高）**：
1. 应用暴露一个"是否有活跃任务"的查询（HTTP 端点或状态文件），重启脚本先查，忙就跳过这轮——最贴合问题。
2. 把重启窗口挪到业务低谷（凌晨），别和你自己使用的时间重叠。
3. 把 `TimeoutStopSec` 拉长到能覆盖最长任务，让 stop 变成"等它做完"。

第 1 条治本，第 3 条兜底，两条一起上比较稳。

顺带一个更基础的判断：**如果服务需要定时重启才稳定，那是内存泄漏或资源没释放的信号**，定时重启只是把问题变成周期性事故。真这么干之前先量一下 RSS 曲线。

---

## 五、用户级单元的几个环境前提

`--user` 这套和系统级单元不是一回事，有几处前提容易漏：

- **开机自启需要 lingering**。`systemctl --user enable` 只对"用户会话已存在"有效；没有 `loginctl enable-linger <user>` 的话，用户不登录就不会起。
- **`journalctl` 也要带 `--user`**。查不到日志第一反应是"没记日志"，往往是查了系统级 journal。
- **WSL2 场景下，Windows 一关整个 Linux 就停了**。这是最容易被忽略的一条——你在笔记本上跑的服务，合盖或者关机，它就没了。别把它当成"服务器"来承诺可用性。
- **`WorkingDirectory` 要写绝对路径**，`~` 不会展开。
- **环境变量别用 `EnvironmentFile` 装 `.env`**：systemd 的 EnvironmentFile **不剥行内注释**，`KEY=value  # 注释` 会把注释一起塞进值里。让应用自己读 `.env` 更安全。

---

## 一份可以直接抄的清单

```ini
[Service]
Type=simple
WorkingDirectory=/absolute/path
ExecStart=/usr/local/bin/node dist/main.js
Restart=on-failure
RestartSec=3
KillSignal=SIGTERM
# 按"最长不可打断操作"的 2 倍来给，不是按理想值
TimeoutStopSec=120
MemoryMax=1500M
```

配套：

- 应用里实现 `SIGTERM` → 停止接新活 → 等收尾 → `exit(0)`
- 重启动作走 `nohup setsid` 或 `systemd-run`，别在会被杀的那个 shell 里跑
- 查状态用 `show -p ActiveState -p MainPID -p ExecMainStartTimestamp` + 真实健康探测
- 有定时重启就先加"活跃任务检查"，没有就别加
- `loginctl enable-linger`，否则重启机器后服务不会自己起来

---

这五条翻完之后，我对 systemd 的感受变了：它不是"配好就不用管"，而是**它替你做决定的地方特别多，而默认值往往按"快速失败"设计，不按"别打断正在干的活"设计**。

凡是"优雅"相关的参数，都得自己往上调，或者自己在应用里实现。
