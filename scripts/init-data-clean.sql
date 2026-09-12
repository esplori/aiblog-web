-- 中性种子（克隆实例默认）：仅系统必需结构
--   users(管理员) + roles + menus + role_menus
-- 不含任何业务/演示内容（分类、标签、站点设置由"站点初始化向导"填写）。
-- 约束兼容：menus/role_menus 在开源版有唯一约束、企业版无，故统一用 WHERE NOT EXISTS；
--          users/roles 两边均有唯一约束，用 ON CONFLICT DO NOTHING。

-- 默认管理员（密码: 123456）
INSERT INTO users (username, email, password_hash, display_name, role, status)
VALUES ('admin', 'admin@example.com', '$2b$10$dbXzmlOex8qoNMauR8i8yeaG5k8kRtNYP/WRP./mBXGvGJ9tfEA/.', 'Admin', 'admin', 'active')
ON CONFLICT DO NOTHING;

-- 默认角色
INSERT INTO roles (code, name, description, enabled)
VALUES ('admin', '管理员', '拥有系统全部权限', TRUE),
       ('editor', '编辑', '可管理文章、分类、标签等内容', TRUE),
       ('user', '普通用户', '仅可浏览与个人操作', TRUE)
ON CONFLICT DO NOTHING;

-- 后台菜单（按 path 防重，避免重启累积）
INSERT INTO menus (name, path, icon, sort_order, enabled)
SELECT v.name, v.path, v.icon, v.sort_order, v.enabled
FROM (VALUES
      ('仪表盘', '/admin', 'ep:odometer', 1, TRUE),
      ('文章管理', '/admin/articles', 'ep:document', 2, TRUE),
      ('分类管理', '/admin/categories', 'ep:folder', 3, TRUE),
      ('标签管理', '/admin/tags', 'ep:price-tag', 4, TRUE),
      ('评论管理', '/admin/comments', 'ep:chat-dot-round', 5, TRUE),
      ('文件管理', '/admin/files', 'ep:folder-opened', 6, TRUE),
      ('用户管理', '/admin/users', 'ep:user', 7, TRUE),
      ('菜单管理', '/admin/menus', 'ep:menu', 8, TRUE),
      ('角色管理', '/admin/roles', 'ep:user-filled', 9, TRUE),
      ('站点设置', '/admin/site-settings', 'ep:setting', 10, TRUE)
     ) AS v(name, path, icon, sort_order, enabled)
WHERE NOT EXISTS (SELECT 1 FROM menus m WHERE m.path = v.path);

-- 角色-菜单授权（admin 全部；editor 内容管理菜单；按角色防重）
INSERT INTO role_menus (role, menu_id)
SELECT 'admin', id FROM menus
WHERE NOT EXISTS (SELECT 1 FROM role_menus WHERE role = 'admin');

INSERT INTO role_menus (role, menu_id)
SELECT 'editor', id FROM menus
WHERE path IN ('/admin', '/admin/articles', '/admin/categories', '/admin/tags', '/admin/comments')
  AND NOT EXISTS (SELECT 1 FROM role_menus WHERE role = 'editor');
