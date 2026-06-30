/**
 * S1 - 开场介绍 Intro
 * manifest key: '2'
 * 四格漫画式背景介绍：逐层叠加 1~5 帧，手动点击翻页。
 * 帧素材 1~5.png 使用未裁剪版本（2800x1840，直接居中叠放）。
 * open 按钮使用裁剪版本（带正确定位 offset）。
 *
 * 流程：
 *   初始 → 背景 + 帧1
 *   点击 → 叠加帧2
 *   点击 → 叠加帧3
 *   点击 → 叠加帧4
 *   点击 → 叠加帧5 + open 按钮（带 hover 效果）
 *   点击 open → Office
 */
window.QW = window.QW || {};

QW.IntroScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'Intro' });
        this.MANIFEST_KEY = '2';
        this.currentFrame = 1;   // 已显示的帧数 (1~5)
        this.allFramesShown = false;
        this.clickZone = null;
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);

        // 加载裁剪版 open 按钮素材（带 offset 定位）
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);

        // 加载未裁剪的帧素材 1~5 + 背景（从 assets/uncropped/）
        this.load.image('intro/bg',  'assets/uncropped/背景.png');
        this.load.image('intro/f1',  'assets/uncropped/1.png');
        this.load.image('intro/f2',  'assets/uncropped/2.png');
        this.load.image('intro/f3',  'assets/uncropped/3.png');
        this.load.image('intro/f4',  'assets/uncropped/4.png');
        this.load.image('intro/f5',  'assets/uncropped/5.png');
    }

    create() {
        const CX = 1400;  // 画布中心 X
        const CY = 920;   // 画布中心 Y
        const loader = QW.AssetLoaderInstance;

        // 背景（未裁剪，居中）
        this.add.image(CX, CY, 'intro/bg').setDepth(0);

        // 第一帧（初始就显示）
        this.add.image(CX, CY, 'intro/f1').setDepth(1);

        // 全屏点击区域（用于翻页）
        this.clickZone = this.add.zone(CX, CY, 2800, 1840)
            .setInteractive()
            .setDepth(50);

        this.clickZone.on('pointerdown', () => this._advanceFrame());

        QW.TransitionManager.finishEnter(this);
    }

    /**
     * 每次点击叠加一帧
     */
    _advanceFrame() {
        if (this.allFramesShown) return;

        const CX = 1400;
        const CY = 920;
        const loader = QW.AssetLoaderInstance;

        this.currentFrame++;
        const depth = this.currentFrame;

        // 叠加当前帧（缓慢出现）
        const frameSprite = this.add.image(CX, CY, `intro/f${this.currentFrame}`).setDepth(depth);
        QW.TransitionManager.revealTargets(this, [frameSprite], 750);

        // 全部 5 帧显示完毕 → 出现 open 按钮
        if (this.currentFrame >= 5) {
            this.allFramesShown = true;
            this._showOpenButton(loader);

            // 移除翻页点击区域
            if (this.clickZone) {
                this.clickZone.destroy();
                this.clickZone = null;
            }
        }
    }

    /**
     * 显示裁剪版 open 按钮（带 hover 切换效果）
     */
    _showOpenButton(loader) {
        const factory = new QW.SpriteFactory(this, loader);

        const normalKey = loader.getKey(this.MANIFEST_KEY, '2/open 未选择.png');
        const hoverKey  = loader.getKey(this.MANIFEST_KEY, '2/open选择.png');

        const btn = factory.createInteractive(this.MANIFEST_KEY, '2/open 未选择.png',
            () => {
                QW.GameState.setFlag('introCompleted', true);
                QW.TransitionManager.goto(this, 'Office');
            },
            { depth: 100, alpha: 0 }
        );
        QW.TransitionManager.revealTargets(this, [btn], 800);

        // hover 效果
        btn.on('pointerover', () => btn.setTexture(hoverKey));
        btn.on('pointerout',  () => btn.setTexture(normalKey));
    }
};
