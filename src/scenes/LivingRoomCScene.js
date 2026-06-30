/**
 * S8 - 客厅C面-初始（橱柜与卧室门）
 * manifest key: '10'
 * 客厅三面循环的第三面（初始暗色调版）。
 *   - 橱柜：点击打开获取水壶
 *   - 卧室门：可进入卧室
 *
 * 花园+池塘任务完成后，此场景被 LivingRoomReturnScene (S13) 替代。
 */
window.QW = window.QW || {};

QW.LivingRoomCScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'LivingRoomC' });
        this.MANIFEST_KEY = '10';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
        QW.AssetLoaderInstance.loadSceneAssets('17，21');
        // 加载道具图标所在的场景资源（水壶道具在 '10' 中）
        QW.AssetLoaderInstance.loadSceneAssets('10');
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        const useLitAssets = GS.getFlag('gardenComplete') || GS.allGardenLit() || GS.getFlag('pondLitUp');

        // 花园点亮后切换为亮态背景
        if (useLitAssets) {
            factory.createBackground('17，21', '17，21/背景.png');
        } else {
            factory.createBackground(this.MANIFEST_KEY);
        }

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);

        // 初始化道具显示系统
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 左右箭头（客厅三面循环：B[左] ← A[中] → C[右]）
        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            useLivingRoomPeers: true,
            currentScene: 'LivingRoomC'
        });

        if (!useLitAssets) {
            // 橱柜
            if (GS.getFlag('cabinetOpened')) {
                // 柜子已打开
                if (!GS.getFlag('wateringCanAcquired')) {
                    // 水壶还在柜子里（未取走）- 显示带水壶的打开柜子
                    console.log('[S8] Cabinet open, watering can inside - click to take');
                    factory.createInteractive(this.MANIFEST_KEY, '10/开柜门壶在柜子里.png',
                        () => this._takeWateringCan(),
                        { depth: 50 }
                    );
                } else {
                    // 水壶已取走 - 显示空柜子
                    console.log('[S8] Cabinet open, watering can taken');
                    factory.create(this.MANIFEST_KEY, '10/空柜子.png', { depth: 50 });
                }
            } else {
                // 柜子关闭 → 点击打开
                console.log('[S8] Cabinet closed - click to open');
                factory.createInteractive(this.MANIFEST_KEY, '10/柜子.png',
                    () => this._openCabinet(),
                    { depth: 50 }
                );
            }

            // 接水触发规则（严格）：
            // 1) 已拿到水壶
            // 2) 还未接水
            // 3) 必须点击指定区域 10/开柜门壶在柜子里.png
            // 4) 是否选中水壶由 _fillWater 内统一拦截判定
            if (GS.hasItem('wateringCan') && !GS.getFlag('waterFilled')) {
                console.log('[S8] Filling interaction enabled on cabinet area only');

                // 仅保留用户指定区域热区
                factory.createInteractive(this.MANIFEST_KEY, '10/开柜门壶在柜子里.png',
                    () => this._fillWater(factory),
                    { depth: 52, alpha: 0.01 }
                );
            } else if (GS.getFlag('waterFilled')) {
                console.log('[S8] Faucet already filled');
            } else {
                console.log('[S8] Faucet not available yet');
            }
        } else {
            console.log('[S8] Lit state active: cabinet visuals hidden');
        }

        // 卧室门（花园点亮后使用亮态门素材）
        const doorManifest = useLitAssets ? '17，21' : this.MANIFEST_KEY;
        const doorAsset = useLitAssets ? '17，21/卧室门.png' : '10/卧室门.png';
        factory.createInteractive(doorManifest, doorAsset,
            () => {
                const canEnterBedroom = GS.allGardenLit() && GS.getFlag('pondLitUp');
                if (!canEnterBedroom) {
                    if (QW.AudioManager) QW.AudioManager.playSigh(this);
                    console.log('[S8] Bedroom locked: requires all lit + pond lit');
                    return;
                }
                if (QW.AudioManager) QW.AudioManager.playDoor(this);
                console.log('[S8] Bedroom door → Bedroom');
                QW.TransitionManager.goto(this, 'Bedroom');
            },
            { depth: 50, playClick: false }
        );

        QW.TransitionManager.finishEnter(this);
    }

    _openCabinet() {
        console.log('[S8] Opening cabinet → found watering can');
        QW.GameState.setFlag('cabinetOpened', true);
        // 重启场景刷新，显示打开的柜子和里面的水壶
        this.scene.restart();
    }

    _takeWateringCan() {
        console.log('[S8] Taking watering can');
        QW.GameState.addItem('wateringCan');
        QW.GameState.setFlag('wateringCanAcquired', true);
        // 拿到水壶后不自动激活，必须由玩家在背包中手动选中
        QW.GameState.setFlag('wateringCanSelected', false);
        console.log('[S8] After taking, inventory:', QW.GameState.inventory);
        // 重启场景刷新，显示空柜子和背包中的水壶
        this.scene.restart();
    }

    _fillWater(factory) {
        if (!QW.InteractionHelper.requireActivatedItem('wateringCan', {
            onBlocked: (reason) => {
                if (reason === 'notActivated') {
                    console.log('[S8] Fill blocked: watering can not selected');
                } else if (reason === 'missingItem') {
                    console.log('[S8] Fill blocked: no watering can');
                }
            }
        })) {
            return;
        }

        console.log('[S8] Filling water into watering can');
        
        // 显示接水动画效果（3秒）
        const fillSprite = factory.create(this.MANIFEST_KEY, '10/接水.png', {
            depth: 60,
            alpha: 0.5
        });
        
        if (fillSprite) {
            // 闪烁效果表示正在接水
            this.tweens.add({
                targets: fillSprite,
                alpha: { from: 0.3, to: 0.8 },
                duration: 500,
                yoyo: true,
                repeat: 2,
                onComplete: () => {
                    fillSprite.destroy();
                    
                    // 设置标志位
                    QW.GameState.setFlag('waterFilled', true);
                    
                    console.log('[S8] Water filling complete');
                    
                    // 重启场景刷新，隐藏水龙头
                    this.scene.restart();
                }
            });
        }
    }
};
