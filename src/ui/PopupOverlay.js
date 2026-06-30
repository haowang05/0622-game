/**
 * PopupOverlay — 通用弹窗组件
 * 用于展示信件、照片、日记等弹出内容。
 *
 * 组成：
 *   - 半透明遮罩（点击可关闭）
 *   - 弹窗容器图片（弹窗.png / 照片弹窗.png 等）
 *   - 内容图片（信件 / 照片 / OS 文字）
 *   - 关闭按钮（X.png）
 */
window.QW = window.QW || {};

QW.PopupOverlay = class {

    /**
     * @param {Phaser.Scene} scene
     * @param {QW.SpriteFactory} factory
     * @param {number} [depth=200]
     */
    constructor(scene, factory, depth) {
        this.scene = scene;
        this.factory = factory;
        this.depth = depth || 200;
        this.sprites = {};
        this.isOpen = false;
    }

    /**
     * 打开一个弹窗
     * @param {object} opts
     * @param {string} opts.manifestKey - 素材 manifest key
     * @param {string} opts.containerName - 弹窗容器素材名（如 "8/弹窗.png"）
     * @param {string} opts.contentName - 内容素材名（如 "3/信.png"）
     * @param {string} opts.closeName - 关闭按钮素材名（如 "8/X.png"）
     * @param {Function} [opts.onClose] - 关闭回调
     */
    open(opts) {
        if (this.isOpen) return;
        this.isOpen = true;
        this._onCloseCallback = opts.onClose || null;

        // 禁用底层输入
        this.scene.input.enabled = false;

        console.log('[Popup] Opening popup with options:', opts);
        console.log('[Popup] Base depth:', this.depth);

        // 半透明遮罩 - depth: 500
        this.sprites.dim = this.scene.add.rectangle(
            1400, 920, 2800, 1840, 0x000000, 0.5
        ).setDepth(this.depth).setInteractive();

        // 弹窗容器 - depth: 501
        if (opts.containerName) {
            this.sprites.container = this.factory.create(
                opts.manifestKey, opts.containerName,
                { depth: this.depth + 1 }
            );
            console.log('[Popup] Container created at depth:', this.sprites.container?.depth);
        }

        // 内容 - depth: 502
        if (opts.contentName) {
            this.sprites.content = this.factory.create(
                opts.manifestKey, opts.contentName,
                { depth: this.depth + 2 }
            );
            console.log('[Popup] Content created at depth:', this.sprites.content?.depth);
        }

        // 关闭按钮 - depth: 600（确保在最顶层）
        if (opts.closeName) {
            const closeSprite = this.factory.create(
                opts.manifestKey, opts.closeName,
                { depth: this.depth + 100 }
            );
            
            if (closeSprite) {
                // 设置为可交互，但不覆盖已有的配置
                closeSprite.setInteractive();
                
                // 添加点击事件
                closeSprite.on('pointerdown', (event) => {
                    console.log('[Popup] X button CLICKED! Event:', event);
                    event.stopPropagation(); // 阻止事件冒泡到遮罩
                    this.close();
                });
                
                // 添加悬停效果
                closeSprite.on('pointerover', () => {
                    console.log('[Popup] X button hover');
                    this.scene.input.setDefaultCursor('pointer');
                });
                closeSprite.on('pointerout', () => {
                    this.scene.input.setDefaultCursor('default');
                });
                
                this.sprites.close = closeSprite;
                console.log('[Popup] Close button created at position:', closeSprite.x, closeSprite.y, 'depth:', closeSprite.depth);
                
                // 强制将关闭按钮移到最顶层
                this.scene.children.bringToTop(closeSprite);
            } else {
                console.error('[Popup] Failed to create close button!');
            }
        }

        // 点击遮罩关闭（但不影响关闭按钮）
        if (this.sprites.dim) {
            this.sprites.dim.on('pointerdown', (event) => {
                console.log('[Popup] Background mask clicked');
                event.stopPropagation();
                this.close();
            });
        }
        
        // 强制将所有弹窗元素移到最顶层（按顺序）
        if (this.sprites.dim) this.scene.children.bringToTop(this.sprites.dim);
        if (this.sprites.container) this.scene.children.bringToTop(this.sprites.container);
        if (this.sprites.content) this.scene.children.bringToTop(this.sprites.content);
        if (this.sprites.close) this.scene.children.bringToTop(this.sprites.close);
        
        console.log('[Popup] All sprites created:', Object.keys(this.sprites));
        console.log('[Popup] Popup opened successfully');
    }

    /**
     * 关闭弹窗
     */
    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        Object.values(this.sprites).forEach(s => {
            if (s) s.destroy();
        });
        this.sprites = {};

        // 恢复输入
        this.scene.input.enabled = true;

        if (this._onCloseCallback) {
            this._onCloseCallback();
            this._onCloseCallback = null;
        }
    }

    /**
     * 简易弹窗：只有全屏图片 + 点击关闭（无容器和X按钮）
     * 适用于全屏照片展示
     */
    openFullscreen(manifestKey, imageName, onClose) {
        this.open({
            manifestKey,
            containerName: null,
            contentName: imageName,
            closeName: null,
            onClose
        });
    }
};
