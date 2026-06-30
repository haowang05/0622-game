/**
 * S14 - 卧室
 * manifest key: '18，20'
 * Hugh 的卧室，墙上有照片（从工程师转木匠）。
 * 点击照片 → 发现日期线索 2513。
 * 密码柜桌子 → PasswordScene。
 */
window.QW = window.QW || {};

QW.BedroomScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'Bedroom' });
        this.MANIFEST_KEY = '18，20';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        const livingRoomTarget = GS.isLivingRoomLit() ? 'LivingRoomReturn' : 'LivingRoomC';

        factory.createBackground(this.MANIFEST_KEY);

        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            peers: [livingRoomTarget, 'Bedroom', livingRoomTarget],
            currentScene: 'Bedroom',
            showBack: true,
            backTargetScene: livingRoomTarget
        });

        factory.createInteractive(this.MANIFEST_KEY, '18，20/密码柜桌子.png',
            () => {
                if (QW.AudioManager) QW.AudioManager.playDoor(this);
                console.log('[S14] Password desk → PasswordScene');
                QW.TransitionManager.goto(this, 'Password');
            },
            { playClick: false }
        );

        QW.TransitionManager.finishEnter(this);
    }
};
