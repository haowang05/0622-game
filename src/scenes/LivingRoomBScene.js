/**
 * S7 - 客厅B面（阳台与花园门）
 * manifest key: '9,11'
 *   - 窗台花：需要水壶浇灌（P2 实现）
 *   - 花园门：点击进入花园
 */
window.QW = window.QW || {};

QW.LivingRoomBScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'LivingRoomB' });
        this.MANIFEST_KEY = '9,11';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        this.cameraSprite = null;
        this.windowsillSprite = null;
        this.gardenDoorSprite = null;

        // 背景
        factory.createBackground(this.MANIFEST_KEY);

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);

        // 初始化道具显示系统
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 左右箭头（客厅三面循环：B[左] ← A[中] → C[右]）
        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            useLivingRoomPeers: true,
            currentScene: 'LivingRoomB'
        });

        // 窗台花（根据状态显示不同素材）
        if (GS.getFlag('flowersWatered')) {
            // 已浇水 - 显示花亮
            console.log('[S7] Flowers watered - showing lit flowers');
            this.windowsillSprite = factory.create(this.MANIFEST_KEY, '9,11/花亮.png', { depth: 50 });
            
            // 如果还未显示相机icon，则显示
            if (!GS.getFlag('cameraIconShown')) {
                console.log('[S7] Showing camera icon');
                this.cameraSprite = factory.createInteractive(this.MANIFEST_KEY, '9,11/相机.png',
                    () => this._takePhoto(),
                    { depth: 100 }
                );
            }
        } else {
            // 未浇水 - 显示原始窗台
            console.log('[S7] Windowsill flower not watered yet');
            this.windowsillSprite = factory.createInteractive(this.MANIFEST_KEY, '9,11/窗台原.png',
                () => this._waterFlowers(factory),
                { depth: 50 }
            );
        }

        // 花园门：浇水成功后才允许进入花园
        if (GS.getFlag('flowersWatered')) {
            this.gardenDoorSprite = factory.createInteractive(this.MANIFEST_KEY, '9,11/花园门.png',
                () => {
                    if (QW.AudioManager) QW.AudioManager.playDoor(this);
                    console.log('[S7] Garden door unlocked → GardenEntry');
                    QW.TransitionManager.goto(this, 'GardenEntry');
                },
                { depth: 50, playClick: false }
            );
        } else {
            this.gardenDoorSprite = factory.create(this.MANIFEST_KEY, '9,11/花园门.png', { depth: 50 });
            console.log('[S7] Garden door locked until flowers watered');
        }

        QW.TransitionManager.finishEnter(this);
    }

    _waterFlowers(factory) {
        const GS = QW.GameState;
        
        // 统一门禁：必须先激活（选中）水壶
        if (!QW.InteractionHelper.requireActivatedItem('wateringCan', {
            onBlocked: (reason) => {
                if (QW.AudioManager) QW.AudioManager.playSigh(this);
                if (reason === 'missingItem') {
                    console.log('[S7] No watering can - need to get from cabinet first');
                } else if (reason === 'notActivated') {
                    console.log('[S7] Watering can not selected - need to select it first');
                }
            }
        })) {
            return;
        }

        if (!GS.getFlag('waterFilled')) {
            if (QW.AudioManager) QW.AudioManager.playSigh(this);
            console.log('[S7] Watering can not filled - need to fill water at faucet first');
            return;
        }
        
        console.log('[S7] Watering flowers!');
        if (QW.AudioManager) QW.AudioManager.playWatering(this);
        
        // 显示浇水动画（使用"浇水.png"素材）
        const waterSprite = factory.create(this.MANIFEST_KEY, '9,11/浇水.png', {
            depth: 80,
            alpha: 0
        });
        
        if (waterSprite) {
            // 使用与接水一致的显隐闪烁动画，增强反馈
            this.tweens.add({
                targets: waterSprite,
                alpha: { from: 0.25, to: 0.95 },
                duration: 500,
                yoyo: true,
                repeat: 5,
                onComplete: () => {
                    waterSprite.destroy();
                    console.log('[S7] Watering animation complete');
                    
                    // 设置标志位
                    GS.setFlag('flowersWatered', true);
                    // 水壶在浇花后消耗，避免与后续道具栏位重叠
                    GS.consumeItem('wateringCan');
                    GS.setFlag('wateringCanSelected', false);
                    GS.setFlag('waterFilled', false);
                    GS.setFlag('cameraIconShown', false);

                    if (this.inventoryDisplay) this.inventoryDisplay.refresh();
                    if (this.windowsillSprite) this.windowsillSprite.destroy();
                    this.windowsillSprite = factory.create(this.MANIFEST_KEY, '9,11/花亮.png', { depth: 50 });

                    // 无缝出现相机，不重启场景
                    if (!this.cameraSprite || !this.cameraSprite.active) {
                        this.cameraSprite = factory.createInteractive(this.MANIFEST_KEY, '9,11/相机.png',
                            () => this._takePhoto(),
                            { depth: 100 }
                        );
                    }

                    // 立即解锁花园门，不需要切换场景
                    if (this.gardenDoorSprite) {
                        this.gardenDoorSprite.destroy();
                    }
                    this.gardenDoorSprite = factory.createInteractive(this.MANIFEST_KEY, '9,11/花园门.png',
                        () => {
                            if (QW.AudioManager) QW.AudioManager.playDoor(this);
                            console.log('[S7] Garden door unlocked (runtime) → GardenEntry');
                            QW.TransitionManager.goto(this, 'GardenEntry');
                        },
                        { depth: 50, playClick: false }
                    );
                }
            });
        }
    }

    _takePhoto() {
        const GS = QW.GameState;
        
        console.log('[S7] Taking photo of watered flowers');
        
        // 设置标志位
        GS.setFlag('photo1Taken', true);
        GS.setFlag('cameraIconShown', true);
        GS.flags.photosTaken++;

        // 当前场景先把相机图标隐藏，避免弹窗期间仍可见
        if (this.cameraSprite) {
            this.cameraSprite.disableInteractive();
            this.cameraSprite.setVisible(false);
        }
        
        // 使用统一函数显示照片弹窗
        QW.showPhotoPopup(this, {
            manifestKey: this.MANIFEST_KEY,
            containerName: '9,11/照片弹窗.png',
            closeName: '9,11/X.png',
            dimAlpha: 0.5,
            overlayName: '9,11/os.png'
        });
    }
};
