import { Layout, Menu, Button, Tooltip } from 'antd';
import { SettingOutlined, TeamOutlined, VideoCameraOutlined, BookOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useState } from 'react';
import GlobalSettingsModal from '../components/GlobalSettingsModal';

const { Sider } = Layout;

export default function Workspace() {
    const navigate = useNavigate();
    const location = useLocation();
    const { projectId } = useParams();
    // Removed collapse state to keep sidebar expanded or fixed width as requested (replacing toggle with action)
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
                theme="dark"
                width={200}
                collapsedWidth={60}
                collapsed={true} // Always collapsed
                trigger={null} // Hide default trigger
            >
                {/* Back / Home Button */}
                <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <Tooltip title="Back to Projects">
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            style={{ color: 'white' }}
                            onClick={() => navigate('/')}
                        />
                    </Tooltip>
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={menuItems}
                    onClick={handleMenuClick}
                    style={{ borderRight: 0 }}
                />

                {/* Global Settings (replacing collapse trigger area) */}
                <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '48px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#001529' }} onClick={() => setSettingsOpen(true)}>
                    <Tooltip title="Global Settings">
                        <SettingOutlined style={{ color: 'white', fontSize: '18px' }} />
                    </Tooltip>
                </div>
            </Sider>
            <Layout>
                <Outlet />
            </Layout>
            <GlobalSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Layout>
    );
}
