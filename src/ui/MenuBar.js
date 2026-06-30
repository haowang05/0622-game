/**
 * MenuBar — 底部菜单栏
 * 渲染菜单栏背景 + 背包图标 + 笔记图标。
 * 大多数游戏场景都有此 UI 层。
 *
 * 素材来源分散在不同 manifest key 中，但各场景的菜单/背包/笔记素材
 * 位置和尺寸一致，通过 manifestKey 参数指定来源。
 */
window.QW = window.QW || {};

QW.MenuBar = class {

    /**
     * @param {Phaser.Scene} scene
     * @param {QW.SpriteFactory} factory
     * @param {string} manifestKey - 当前场景的 manifest key
     * @param {object} [opts]
     * @param {number} [opts.depth=100] - 渲染深度（UI 层在最上方）
     */
    constructor(scene, factory, manifestKey, opts = {}) {
        this.scene = scene;
        this.factory = factory;
        this.manifestKey = manifestKey;
        this.depth = opts.depth || 100;
        this.sprites = {};
        this._build();
    }

    _build() {
        // 菜单栏背景
        const barName = this.manifestKey + '/菜单栏.png';
        this.sprites.bar = this.factory.create(this.manifestKey, barName, {
            depth: this.depth
        });

        // 背包图标
        const bagName = this.manifestKey + '/背包.png';
        this.sprites.bag = this.factory.create(this.manifestKey, bagName, {
            depth: this.depth + 1
        });
        if (this.sprites.bag) {
            this.sprites.bag.setInteractive();
            this.sprites.bag.on('pointerover', () => this.scene.input.setDefaultCursor('pointer'));
            this.sprites.bag.on('pointerout', () => this.scene.input.setDefaultCursor('default'));
            this.sprites.bag.on('pointerdown', () => {
                if (this.onBagClick) this.onBagClick();
            });
        }

        // 笔记图标（部分场景有）
        const noteName = this.manifestKey + '/笔记.png';
        const noteInfo = QW.AssetLoaderInstance.getAssetInfo(this.manifestKey, noteName);
        if (noteInfo) {
            this.sprites.note = this.factory.create(this.manifestKey, noteName, {
                depth: this.depth + 1
            });
            if (this.sprites.note) {
                this.sprites.note.setInteractive();
                this.sprites.note.on('pointerover', () => this.scene.input.setDefaultCursor('pointer'));
                this.sprites.note.on('pointerout', () => this.scene.input.setDefaultCursor('default'));
                this.sprites.note.on('pointerdown', () => {
                    if (this.onNoteClick) this.onNoteClick();
                });
            }
        }
    }

    /** 设置背包点击回调 */
    onBagClick(callback) {
        this._bagClickCallback = callback;
    }

    /** 设置笔记点击回调 */
    onNoteClick(callback) {
        this._noteClickCallback = callback;
    }

    /** 显示/隐藏整个菜单栏 */
    setVisible(visible) {
        Object.values(this.sprites).forEach(s => {
            if (s) s.setVisible(visible);
        });
    }

    /** 销毁 */
    destroy() {
        Object.values(this.sprites).forEach(s => {
            if (s) s.destroy();
        });
    }
};
