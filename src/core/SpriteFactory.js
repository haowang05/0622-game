/**
 * SpriteFactory — 精灵工厂
 * 根据 manifest 中的 offset 数据，自动将裁剪后的素材定位到正确的画布位置。
 *
 * 定位公式（Phaser 默认 origin 0.5）：
 *   sprite.x = offset.x + width / 2
 *   sprite.y = offset.y + height / 2
 *
 * 这样裁剪后的精灵在 2800×1840 画布上的位置与原始 Procreate 导出完全一致。
 */
window.QW = window.QW || {};

QW.SpriteFactory = class {

    /**
     * @param {Phaser.Scene} scene - 当前 Phaser 场景
     * @param {QW.AssetLoader} loader - 素材加载器
     */
    constructor(scene, loader) {
        this.scene = scene;
        this.loader = loader;
    }

    /* ======== 核心创建方法 ======== */

    /**
     * 创建一个定位好的精灵
     * @param {string} manifestKey - manifest scene key（如 '8', '5,7'）
     * @param {string} assetName - 素材文件名（如 "8/书架.png"）
     * @param {object} [opts] - 可选配置
     * @param {number} [opts.depth] - 渲染深度
     * @param {number} [opts.alpha] - 透明度
     * @param {boolean} [opts.visible] - 是否可见
     * @param {boolean} [opts.interactive] - 是否可交互
     * @returns {Phaser.GameObjects.Image|null}
     */
    create(manifestKey, assetName, opts = {}) {
        const key = this.loader.getKey(manifestKey, assetName);
        if (!key) {
            console.warn('[SpriteFactory] 素材不存在:', manifestKey, assetName);
            return null;
        }
        const pos = this.loader.getPosition(manifestKey, assetName);
        if (!pos) return null;

        const sprite = this.scene.add.image(pos.x, pos.y, key);

        if (opts.depth !== undefined) sprite.setDepth(opts.depth);
        if (opts.alpha !== undefined) sprite.setAlpha(opts.alpha);
        if (opts.visible !== undefined) sprite.setVisible(opts.visible);
        if (opts.interactive) sprite.setInteractive();

        // 附加 manifest 元数据，方便后续使用
        sprite.setData('manifestKey', manifestKey);
        sprite.setData('assetName', assetName);
        sprite.setData('assetWidth', pos.width);
        sprite.setData('assetHeight', pos.height);

        return sprite;
    }

    /**
     * 创建背景精灵（总是 2800×1840，depth=0）
     * @param {string} manifestKey
     * @param {string} [bgName] - 背景文件名，默认 "XX/背景.png"
     * @returns {Phaser.GameObjects.Image|null}
     */
    createBackground(manifestKey, bgName) {
        if (!bgName) {
            // 自动推断背景文件名，使用完整 manifestKey 作为前缀
            bgName = manifestKey + '/背景.png';
        }
        return this.create(manifestKey, bgName, { depth: 0 });
    }

    /**
     * 创建可交互精灵（自动 setInteractive + pointer 光标）
     * @param {string} manifestKey
     * @param {string} assetName
     * @param {Function} [callback] - 点击回调
     * @param {object} [opts] - 同 create() 的 opts
     * @returns {Phaser.GameObjects.Image|null}
     */
    createInteractive(manifestKey, assetName, callback, opts = {}) {
        const sprite = this.create(manifestKey, assetName, {
            ...opts,
            interactive: true
        });
        if (sprite && callback) {
            sprite.on('pointerdown', (...args) => {
                callback(...args);
                if (opts.playClick !== false && QW.AudioManager) {
                    QW.AudioManager.playClick(this.scene);
                }
            });
        }
        if (sprite) {
            sprite.on('pointerover', () => this.scene.input.setDefaultCursor('pointer'));
            sprite.on('pointerout', () => this.scene.input.setDefaultCursor('default'));
        }
        return sprite;
    }

    /**
     * 在同一位置替换精灵（用于状态切换，如花亮替换花原）
     * @param {Phaser.GameObjects.Image} oldSprite - 要替换的旧精灵
     * @param {string} manifestKey
     * @param {string} newAssetName - 新素材名
     * @param {object} [opts]
     * @returns {Phaser.GameObjects.Image|null}
     */
    replace(oldSprite, manifestKey, newAssetName, opts = {}) {
        const depth = oldSprite.depth;
        const alpha = oldSprite.alpha;
        const visible = oldSprite.visible;
        oldSprite.destroy();
        return this.create(manifestKey, newAssetName, {
            depth,
            alpha,
            visible,
            ...opts
        });
    }

    /**
     * 创建一个不可见的点击区域（用于组合图标的点击热区）
     * @param {number} x - 中心 x
     * @param {number} y - 中心 y
     * @param {number} width
     * @param {number} height
     * @param {Function} callback
     * @param {number} [depth]
     * @returns {Phaser.GameObjects.Zone}
     */
    createHitZone(x, y, width, height, callback, depth) {
        const zone = this.scene.add.zone(x, y, width, height)
            .setInteractive();
        if (depth !== undefined) zone.setDepth(depth);
        if (callback) zone.on('pointerdown', (...args) => {
            callback(...args);
            if (QW.AudioManager) QW.AudioManager.playClick(this.scene);
        });
        zone.on('pointerover', () => this.scene.input.setDefaultCursor('pointer'));
        zone.on('pointerout', () => this.scene.input.setDefaultCursor('default'));
        return zone;
    }
};
