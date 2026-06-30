/**
 * S2 - 委托办公室
 * manifest key: '3'
 * 桌上有委托信，点击弹出信件图片。
 * 阅读完信件后出现 Accept 按钮 → DialogScene。
 */
window.QW = window.QW || {};

QW.OfficeScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'Office' });
        this.MANIFEST_KEY = '3';
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

        // 信件（可点击）
        factory.createInteractive(this.MANIFEST_KEY, '3/信.png',
            () => this._readLetter(factory)
        );

        QW.TransitionManager.finishEnter(this);
    }

    _readLetter(factory) {
        console.log('[S2] Reading letter (P1 stub → go to Dialog)');
        QW.GameState.setFlag('letterRead', true);
        QW.TransitionManager.goto(this, 'Dialog');
    }
};
