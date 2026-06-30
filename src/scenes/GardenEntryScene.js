/**
 * S9 - 花园入口（冷色调）
 * manifest key: '12'
 * 从客厅B面花园门出来后的初始花园场景。
 * 草坪可点击进入仰望视角(S10)。
 * 任务完成后此场景变为暖色调的 PondApproachScene (S11)。
 */
window.QW = window.QW || {};

QW.GardenEntryScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'GardenEntry' });
        this.MANIFEST_KEY = '12';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
        QW.AssetLoaderInstance.loadSceneAssets('14，16');
        // 背包道具图标（木头/锯子）跨场景显示
        QW.AssetLoaderInstance.loadSceneAssets('13');
        QW.AssetLoaderInstance.loadSceneAssets('15');
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        const canEnterPond = GS.getFlag('woodAcquired') || GS.allGardenLit();
        const pondPos = QW.AssetLoaderInstance.getPosition(this.MANIFEST_KEY, '12/水塘.png');
        // 12/水塘.png 裁剪区域很大（覆盖大片草地），实际可点池塘热区需手动收窄
        const pondHitRect = pondPos ? {
            // 扩大池塘判定区，确保点池塘稳定进入 PondFish
            x: pondPos.x,
            y: pondPos.y + 120,
            width: pondPos.width * 0.68,
            height: pondPos.height * 0.50
        } : null;

        // 根据花园是否完成选择背景
        if (GS.getFlag('gardenComplete')) {
            // 全部点亮后，入口场景切换为暖色亮背景
            factory.createBackground('14，16', '14，16/背景.png');
        } else {
            factory.createBackground(this.MANIFEST_KEY, '12/背景.png');
        }

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 返回箭头（回到客厅B面）
        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            showBack: true,
            backTargetScene: 'LivingRoomB'
        });

        // 草坪（可点击 → 花园仰望）
        // 亮背景下复用同区域热区，避免覆盖亮背景视觉
        if (GS.getFlag('gardenComplete')) {
            factory.createInteractive(this.MANIFEST_KEY, '12/草坪.png',
                () => {
                    console.log('[S9] Lawn hotspot clicked (lit) → GardenSky');
                    QW.TransitionManager.goto(this, 'GardenSky');
                },
                { alpha: 0.01, depth: 1 }
            );
        } else {
            factory.createInteractive(this.MANIFEST_KEY, '12/草坪.png',
                () => {
                    console.log('[S9] Lawn clicked → GardenSky');
                    QW.TransitionManager.goto(this, 'GardenSky');
                }
            );
        }

        // 池塘在 GardenEntry 中始终显示，仅亮/未亮状态切换
        const pondAsset = GS.getFlag('pondLitUp') ? '14，16/池塘亮.png' : '14，16/池塘原.png';
        factory.create('14，16', pondAsset);

        // 池塘入口：拿到木头或完成花云点亮后可进入 PondFish
        if (canEnterPond && pondHitRect) {
            factory.createHitZone(
                pondHitRect.x,
                pondHitRect.y,
                pondHitRect.width,
                pondHitRect.height,
                () => {
                    console.log('[S9] Pond hotspot clicked → PondFish');
                    QW.TransitionManager.goto(this, 'PondFish');
                },
                3
            );
        }

        QW.TransitionManager.finishEnter(this);
    }
};
