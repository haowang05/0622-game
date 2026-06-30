/**
 * S0 - 主菜单
 * manifest key: '1'
 * 展示游戏标题，点击 Start 进入 Intro。
 */
window.QW = window.QW || {};

QW.MainMenuScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
        this.MANIFEST_KEY = '1';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const loader = QW.AssetLoaderInstance;

        // 背景
        factory.createBackground(this.MANIFEST_KEY);

        // 为按钮添加 hover 切换效果：pointerover → 选择态，pointerout → 未选择态
        const hoverBtn = (sprite, normalAsset, hoverAsset) => {
            const normalKey = loader.getKey(this.MANIFEST_KEY, normalAsset);
            const hoverKey  = loader.getKey(this.MANIFEST_KEY, hoverAsset);
            sprite.on('pointerover', () => sprite.setTexture(hoverKey));
            sprite.on('pointerout',  () => sprite.setTexture(normalKey));
        };

        // Start 按钮
        const startBtn = factory.createInteractive(this.MANIFEST_KEY, '1/start 未选择.png',
            () => {
                QW.TransitionManager.goto(this, 'Intro');
            }
        );
        hoverBtn(startBtn, '1/start 未选择.png', '1/start 选择.png');

        // Settings 按钮（P1 stub，无功能）
        const settingBtn = factory.createInteractive(this.MANIFEST_KEY, '1/setting 未选择.png',
            () => console.log('[S0] Settings clicked (stub)')
        );
        hoverBtn(settingBtn, '1/setting 未选择.png', '1/setting 选择.png');

        // Exit 按钮（P1 stub，无功能）
        const exitBtn = factory.createInteractive(this.MANIFEST_KEY, '1/exit 未选择.png',
            () => console.log('[S0] Exit clicked (stub)')
        );
        hoverBtn(exitBtn, '1/exit 未选择.png', '1/exit 选择.png');

        QW.TransitionManager.finishEnter(this);
    }
};
