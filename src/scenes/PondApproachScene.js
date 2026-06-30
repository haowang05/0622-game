/**
 * S11 - 花园+池塘 点亮态
 * manifest key: '14，16'
 * 花园和池塘任务完成后的暖色调场景。
 * 池塘可点击进入池塘特写(S12)。
 * 返回客厅 → 客厅C面切换为修复后版本(S13)。
 */
window.QW = window.QW || {};

QW.PondApproachScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'PondApproach' });
        this.MANIFEST_KEY = '14，16';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
        // 背包道具图标（木头/锯子）跨场景显示
        QW.AssetLoaderInstance.loadSceneAssets('13');
        QW.AssetLoaderInstance.loadSceneAssets('15');
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;

        // 背景
        factory.createBackground(this.MANIFEST_KEY);

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 返回箭头（回到花园入口）
        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            showBack: true
        });

        // 池塘（根据状态选择亮/原）
        if (GS.getFlag('pondLitUp')) {
            factory.createInteractive(this.MANIFEST_KEY, '14，16/池塘亮.png',
                () => {
                    console.log('[S11] Lit pond → PondFish');
                    QW.TransitionManager.goto(this, 'PondFish');
                }
            );
        } else {
            factory.createInteractive(this.MANIFEST_KEY, '14，16/池塘原.png',
                () => {
                    console.log('[S11] Pond → PondFish');
                    QW.TransitionManager.goto(this, 'PondFish');
                }
            );
        }

        // 标记花园完成（首次进入此场景时触发客厅变亮）
        if (!GS.getFlag('gardenComplete')) {
            GS.setFlag('gardenComplete', true);
            console.log('[S11] Garden complete → Living Room C will upgrade to S13');
        }

        QW.TransitionManager.finishEnter(this);
    }
};
