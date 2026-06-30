/**
 * S13 - 客厅C面-修复后（全亮）
 * manifest key: '17，21'
 * 花园+池塘任务完成后的情感转折点。
 * 替代 LivingRoomCScene (S8)，整体变亮。
 * 卧室门可进入卧室。
 */
window.QW = window.QW || {};

QW.LivingRoomReturnScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'LivingRoomReturn' });
        this.MANIFEST_KEY = '17，21';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);

        // 背景（修复后/亮色）
        factory.createBackground(this.MANIFEST_KEY);

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 左右箭头（客厅三面循环，此时 LivingRoomC 被替换为本场景）
        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            useLivingRoomPeers: true,
            currentScene: 'LivingRoomReturn'
        });

        factory.createInteractive(this.MANIFEST_KEY, '17，21/卧室门.png',
            () => {
                if (QW.AudioManager) QW.AudioManager.playDoor(this);
                console.log('[S13] Bedroom door → Bedroom');
                QW.TransitionManager.goto(this, 'Bedroom');
            },
            { playClick: false }
        );

        QW.TransitionManager.finishEnter(this);
    }
};
