/**
 * S3 - 接受委托
 * manifest key: '4'
 * 阅读完信件后的对话场景，点击 Accept 按钮前往 Hugh 住所。
 */
window.QW = window.QW || {};

QW.DialogScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'Dialog' });
        this.MANIFEST_KEY = '4';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);

        // 背景
        factory.createBackground(this.MANIFEST_KEY);

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);

        // Accept 按钮
        factory.createInteractive(this.MANIFEST_KEY, '4/accept 按钮.png',
            () => {
                console.log('[S3] Commission accepted → HouseExterior');
                QW.GameState.setFlag('commissionAccepted', true);
                QW.TransitionManager.goto(this, 'HouseExterior');
            }
        );

        QW.TransitionManager.finishEnter(this);
    }
};
