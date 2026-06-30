/**
 * main.js — Phaser 游戏启动配置
 * 画布 2800×1840（匹配 Procreate 素材尺寸），Scale.FIT 居中。
 * 禁用物理引擎（纯点击解谜不需要）。
 */

(function () {
    'use strict';
    const APP_VERSION = 'v0.3.31-20260701-0012';
    window.QW = window.QW || {};
    window.QW.APP_VERSION = APP_VERSION;

    let versionBadgeVisible = true;

    function ensureVersionBadge() {
        let versionBadge = document.getElementById('game-version-badge');
        if (!versionBadge) {
            versionBadge = document.createElement('div');
            versionBadge.id = 'game-version-badge';
            versionBadge.style.cssText = `
                position: fixed;
                left: 10px;
                top: 10px;
                background: rgba(0, 0, 0, 0.65);
                color: #00e5ff;
                font-family: monospace;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 6px;
                z-index: 9999;
                pointer-events: none;
            `;
            document.body.appendChild(versionBadge);
        }
        versionBadge.textContent = `版本 ${APP_VERSION}`;
        versionBadge.style.display = versionBadgeVisible ? 'block' : 'none';
    }

    // -------- BootScene：负责加载 manifest --------
    class BootScene extends Phaser.Scene {
        constructor() {
            super({ key: 'Boot' });
        }

        preload() {
            QW.AssetLoaderInstance = new QW.AssetLoader(this);
            QW.AssetLoaderInstance.loadManifest();
        }

        create() {
            QW.AssetLoaderInstance.parseManifest();
            console.log('[Boot] Manifest ready. Canvas:', QW.AssetLoaderInstance.getCanvasSize());
            this.scene.start('AssetLoader');
        }
    }

    // -------- AssetLoaderScene：加载全局 UI 素材后启动游戏 --------
    class AssetLoaderScene extends Phaser.Scene {
        constructor() {
            super({ key: 'AssetLoader' });
        }

        preload() {
            QW.AssetLoaderInstance.bindScene(this);
            QW.AssetLoaderInstance.loadIcons();
            if (QW.AudioManager) QW.AudioManager.preload(this);
            QW.AssetLoaderInstance.loadSceneAssets('1');
        }

        create() {
            console.log('[Boot] UI icons + menu assets loaded → MainMenu');
            this.scene.start('MainMenu');
        }
    }

    // -------- Phaser 游戏配置 --------
    const config = {
        type: Phaser.AUTO,
        width: 2800,
        height: 1840,
        parent: 'game-container',
        backgroundColor: '#000000',

        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },

        // 场景注册顺序（Boot 最先）
        scene: [
            BootScene,
            AssetLoaderScene,
            QW.MainMenuScene,          // S0
            QW.IntroScene,              // S1
            QW.OfficeScene,             // S2
            QW.DialogScene,             // S3
            QW.HouseExteriorScene,      // S4
            QW.MailboxScene,            // S5
            QW.LivingRoomAScene,        // S6
            QW.LivingRoomBScene,        // S7
            QW.LivingRoomCScene,        // S8
            QW.GardenEntryScene,        // S9
            QW.GardenSkyScene,          // S10
            QW.PondApproachScene,       // S11
            QW.PondFishScene,           // S12
            QW.LivingRoomReturnScene,   // S13
            QW.BedroomScene,            // S14
            QW.PasswordScene,           // S15
            QW.SofaRepairScene,         // S16
            QW.EndingScene,             // S17
            QW.PopupScene               // 弹窗场景（最后注册，确保在最顶层）
        ]
    };

    // 启动游戏
    window.QW.game = new Phaser.Game(config);
    ensureVersionBadge();

    // 开发辅助：在控制台暴露 GameState 方便调试
    console.log('[QW] Game initialized. Version:', APP_VERSION);
    console.log('[QW] Use QW.GameState in console to inspect state.');
    console.log('[QW] Navigation: MainMenu → Intro → Office → Dialog → HouseExterior → ...');

    // ======== 开发调试面板 ========
    // 按 D 键显示/隐藏调试面板
    let debugPanelVisible = false;
    let debugPanel = null;

    function createDebugPanel() {
        if (debugPanel) return;
        
        debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 350px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 15px;
            border-radius: 8px;
            overflow-y: auto;
            z-index: 9999;
            display: none;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        `;
        document.body.appendChild(debugPanel);
    }

    function updateDebugPanel() {
        if (!debugPanel || !debugPanelVisible) return;
        
        const gameState = window.QW.GameState;
        const game = window.QW.game;
        
        // 获取已加载的纹理 - 使用正确的方式
        const loadedTextures = [];
        try {
            const textureManager = game.textures;
            if (textureManager) {
                // Phaser 3 中遍历纹理的正确方式
                const textures = textureManager.list;
                for (const key in textures) {
                    if (key !== '__DEFAULT' && key !== '__MISSING' && !key.startsWith('__')) {
                        loadedTextures.push(key);
                    }
                }
            }
        } catch(e) {
            console.log('[Debug] Texture access error:', e);
        }
        
        // 获取当前场景中的所有sprites及其深度
        const currentScenes = game.scene.getScenes(true);
        let spriteInfo = '';
        
        currentScenes.forEach(scene => {
            try {
                if (scene.children) {
                    const children = scene.children.list || [];
                    const sprites = children.filter(child => child && (child.type === 'Sprite' || child instanceof Phaser.GameObjects.Sprite));
                    
                    if (sprites.length > 0) {
                        spriteInfo += `<div style="color: #ff0; margin-top: 5px;">${scene.scene.key} (${sprites.length} sprites):</div>`;
                        sprites.slice(-10).forEach(sprite => {
                            const textureKey = sprite.texture && sprite.texture.key ? sprite.texture.key : 'N/A';
                            const depth = sprite.depth !== undefined ? sprite.depth : 'N/A';
                            const visible = sprite.visible !== undefined ? sprite.visible : 'N/A';
                            const shortName = textureKey.split('/').pop() || textureKey;
                            spriteInfo += `<div style="font-size: 9px; color: #aaa;">[${depth}] ${shortName} (vis:${visible})</div>`;
                        });
                        if (sprites.length > 10) {
                            spriteInfo += `<div style="color: #888;">... 还有 ${sprites.length - 10} 个sprites</div>`;
                        }
                    }
                }
            } catch(e) {
                spriteInfo += `<div style="color: #f00;">${scene.scene.key}: Error accessing children</div>`;
                console.log('[Debug] Scene access error:', e);
            }
        });
        
        debugPanel.innerHTML = `
            <div style="color: #ff0; font-size: 14px; margin-bottom: 10px;">🔧 调试面板 (按D隐藏)</div>
            
            <div style="margin-bottom: 10px;">
                <div style="color: #0ff;">当前场景:</div>
                <div>${currentScenes.map(s => s.scene.key).join(', ') || 'None'}</div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="color: #0ff;">Sprites深度信息:</div>
                <div style="max-height: 300px; overflow-y: auto; font-size: 10px;">
                    ${spriteInfo || '<div style="color: #888;">No sprites found</div>'}
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="color: #0ff;">已加载素材 (${loadedTextures.length}):</div>
                <div style="max-height: 150px; overflow-y: auto; font-size: 10px;">
                    ${loadedTextures.length > 0 ? loadedTextures.slice(-15).join('<br>') : '<div style="color: #888;">None</div>'}
                    ${loadedTextures.length > 15 ? `<div style="color: #888;">... 还有 ${loadedTextures.length - 15} 个</div>` : ''}
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="color: #0ff;">背包物品:</div>
                <div>${Object.entries(gameState.inventory).filter(([k,v]) => v).map(([k]) => k).join(', ') || '空'}</div>
            </div>
            
            <div>
                <div style="color: #0ff;">关键标志位:</div>
                <div style="font-size: 10px;">
                    cabinetOpened: ${gameState.flags.cabinetOpened}<br>
                    wateringCanAcquired: ${gameState.hasItem('wateringCan')}<br>
                    waterFilled: ${gameState.flags.waterFilled}<br>
                    wateringCanSelected: ${gameState.flags.wateringCanSelected}<br>
                    flowersWatered: ${gameState.flags.flowersWatered}<br>
                    cameraIconShown: ${gameState.flags.cameraIconShown}
                </div>
            </div>
        `;
    }

    // 切换调试面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'v' || e.key === 'V') {
            versionBadgeVisible = !versionBadgeVisible;
            const versionBadge = document.getElementById('game-version-badge');
            if (versionBadge) {
                versionBadge.style.display = versionBadgeVisible ? 'block' : 'none';
            }
        }
        if (e.key === 'd' || e.key === 'D') {
            if (!debugPanel) createDebugPanel();
            debugPanelVisible = !debugPanelVisible;
            debugPanel.style.display = debugPanelVisible ? 'block' : 'none';
            if (debugPanelVisible) updateDebugPanel();
        }
    });

    // 每秒更新一次调试面板
    setInterval(() => {
        if (debugPanelVisible) updateDebugPanel();
    }, 1000);

})();
