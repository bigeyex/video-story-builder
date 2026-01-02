import { Layout, Menu, Button } from 'antd';
import { SettingOutlined, TeamOutlined, VideoCameraOutlined, BookOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useState } from 'react';
import GlobalSettingsModal from '../components/GlobalSettingsModal';

const { Sider } = Layout;

export default function Workspace() {
    const navigate = useNavigate();
    const location = useLocation();
    const { projectId } = useParams();
    const [collapsed, setCollapsed] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Determine selected key based on path
    const currentPath = location.pathname.split('/').pop();
    const selectedKey = currentPath || 'settings';

    const menuItems = [
        { key: 'settings', icon: <BookOutlined />, label: 'World Settings' },
        { key: 'characters', icon: <TeamOutlined />, label: 'Characters' },
        { key: 'scenes', icon: <VideoCameraOutlined />, label: 'Scenes' },
    ];

    const handleMenuClick = ({ key }: { key: string }) => {
        navigate(`/workspace/${projectId}/${key}`);
    };

    return (
        <Layout style={{ height: '100vh' }}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                theme="dark"
                width={200}
                collapsedWidth={60}
            >
                <div style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={menuItems}
                    onClick={handleMenuClick}
                />
                <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '16px', textAlign: 'center' }}>
                    <Button type="text" icon={<SettingOutlined />} style={{ color: 'white' }} onClick={() => setSettingsOpen(true)} />
                </div>
            </Sider>
            <Layout>
                <Outlet />
            </Layout>
            <GlobalSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Layout>
    );
}
