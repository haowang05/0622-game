/**
 * PopupScene - 独立的弹窗场景
 * 使用独立Scene确保弹窗始终在所有游戏内容之上显示
 */
window.QW = window.QW || {};

/**
 * 统一照片弹窗入口：显示
 * @param {Phaser.Scene} scene - 调用方场景
 * @param {object} data - PopupScene 数据
 */
QW.showPhotoPopup = function(scene, data) {
    if (!scene || !scene.scene) return;

    // 若已有弹窗在运行，先安全关闭，避免层级与输入状态错乱
    if (scene.scene.isActive('PopupScene')) {
        QW.closePhotoPopup(scene);
    }

    scene.scene.launch('PopupScene', data);
    scene.scene.bringToTop('PopupScene');
};

/**
 * 统一照片弹窗入口：关闭
 * @param {Phaser.Scene} scene - 调用方场景
 */
QW.closePhotoPopup = function(scene) {
    if (!scene || !scene.scene || !scene.scene.isActive('PopupScene')) return;

    const popupScene = scene.scene.get('PopupScene');
    if (popupScene && typeof popupScene.close === 'function') {
        popupScene.close();
    } else {
        scene.scene.stop('PopupScene');
    }
};

QW.PopupScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'PopupScene', active: false });
        this.sprites = {};
        this._onCloseCallback = null;
    }

    /**
     * 打开弹窗
     * @param {object} data - 从scene.start()传入的数据
     */
    init(data) {
        console.log('[PopupScene] Opening with data:', data);
        this._popupData = data;
    }

    create() {
        const data = this._popupData;

        // 关键修复：将PopupScene带到场景栈最顶层
        this.scene.bringToTop('PopupScene');
        console.log('[PopupScene] Brought to top of scene stack');

        // 清理上一次可能残留的精灵
        Object.values(this.sprites).forEach((value) => this._destroySpriteValue(value));
        this.sprites = {};

        // 禁用底层场景的输入（bringToTop后，PopupScene在最后一个，游戏场景在它前面）
        const scenes = this.scene.manager.getScenes(true);
        scenes.forEach(s => {
            if (s !== this && s.input) {
                s.input.enabled = false;
            }
        });

        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);

        const dimAlpha = data.dimAlpha !== undefined ? data.dimAlpha : 0.5;
        const popupBaseDepth = data.baseDepth !== undefined ? data.baseDepth : 1000;

        // 半透明遮罩（可按弹窗类型配置透明度）
        this.sprites.dim = this.add.rectangle(
            1400, 920, 2800, 1840, 0x000000, dimAlpha
        ).setDepth(popupBaseDepth).setInteractive();

        // 弹窗容器
        if (data.containerName) {
            console.log('[PopupScene] Creating container:', data.containerName, 'with manifestKey:', data.manifestKey);
            this.sprites.container = factory.create(
                data.manifestKey, data.containerName,
                { depth: popupBaseDepth + 1 }
            );
            console.log('[PopupScene] Container result:', this.sprites.container ? 'SUCCESS' : 'FAILED');
        }

        // 内容
        if (data.contentName) {
            console.log('[PopupScene] Creating content:', data.contentName, 'with manifestKey:', data.manifestKey);
            this.sprites.content = factory.create(
                data.manifestKey, data.contentName,
                { depth: popupBaseDepth + 2 }
            );
            console.log('[PopupScene] Content result:', this.sprites.content ? 'SUCCESS' : 'FAILED');
        }

        // 叠加层（用于相机弹窗中的OS等，跟随弹窗一起关闭）
        const overlayNames = [];
        if (data.overlayName) overlayNames.push(data.overlayName);
        if (Array.isArray(data.overlayNames)) overlayNames.push(...data.overlayNames);

        if (overlayNames.length > 0) {
            this.sprites.overlays = [];
            overlayNames.forEach((overlayName, index) => {
                const overlaySprite = factory.create(
                    data.overlayManifestKey || data.manifestKey,
                    overlayName,
                    { depth: popupBaseDepth + 50 + index }
                );
                if (overlaySprite) {
                    if (data.overlayInteractions && typeof data.overlayInteractions[overlayName] === 'function') {
                        overlaySprite.setInteractive();
                        overlaySprite.on('pointerdown', data.overlayInteractions[overlayName]);
                    }
                    this.sprites.overlays.push(overlaySprite);
                }
            });
            console.log('[PopupScene] Overlay count:', this.sprites.overlays.length);
        }

        // 弹窗内可交互热点（用于照片中的可点击道具等）
        if (Array.isArray(data.interactiveItems) && data.interactiveItems.length > 0) {
            this.sprites.interactiveItems = [];
            data.interactiveItems.forEach((item, index) => {
                if (!item || !item.assetName || typeof item.onClick !== 'function') return;
                const interactiveSprite = factory.createInteractive(
                    item.manifestKey || data.manifestKey,
                    item.assetName,
                    item.onClick,
                    {
                        depth: item.depth !== undefined ? item.depth : (popupBaseDepth + 60 + index),
                        alpha: item.alpha !== undefined ? item.alpha : 0.01
                    }
                );
                if (interactiveSprite) {
                    this.sprites.interactiveItems.push(interactiveSprite);
                }
            });
            console.log('[PopupScene] Interactive item count:', this.sprites.interactiveItems.length);
        }

        // 关闭按钮
        if (data.closeName) {
            console.log('[PopupScene] Creating close button:', data.closeName, 'with manifestKey:', data.manifestKey);
            this.sprites.close = factory.create(
                data.manifestKey, data.closeName,
                { depth: popupBaseDepth + 100 }
            );
            console.log('[PopupScene] Close button result:', this.sprites.close ? 'SUCCESS' : 'FAILED');

            if (this.sprites.close) {
                this.sprites.close.setInteractive();
                this.sprites.close.on('pointerdown', () => {
                    console.log('[PopupScene] X button clicked');
                    QW.closePhotoPopup(this);
                });

                this.sprites.close.on('pointerover', () => {
                    this.input.setDefaultCursor('pointer');
                });
                this.sprites.close.on('pointerout', () => {
                    this.input.setDefaultCursor('default');
                });
            }
        }

        // 点击遮罩关闭
        if (this.sprites.dim) {
            this.sprites.dim.on('pointerdown', () => {
                console.log('[PopupScene] Mask clicked');
                QW.closePhotoPopup(this);
            });
        }

        this._onCloseCallback = data.onClose || null;
        console.log('[PopupScene] Popup opened');
        
        // 调试：输出弹窗场景中所有sprites的深度信息
        this._debugSpriteDepths();
    }
    
    _debugSpriteDepths() {
        console.log(`[Debug] === ${this.scene.key} (Popup) Sprite Depths ===`);
        const children = this.children.list || [];
        console.log('[Debug] Total children in scene:', children.length);
        
        children.forEach((child, index) => {
            if (!child) return;
            const type = child.type;
            const textureKey = child.texture ? child.texture.key : (type === 'Rectangle' ? 'Rectangle(Dim)' : 'N/A');
            const depth = child.depth;
            const visible = child.visible !== undefined ? child.visible : 'N/A';
            console.log(`[Debug] [${index}] type:${type} | depth:${depth} | ${textureKey} | visible:${visible}`);
        });
        
        console.log('[Debug] Sprites object keys:', Object.keys(this.sprites));
        console.log('[Debug] Container exists:', !!this.sprites.container);
        console.log('[Debug] Content exists:', !!this.sprites.content);
        console.log('[Debug] Close exists:', !!this.sprites.close);
        if (this.sprites.container) {
            console.log('[Debug] Container depth:', this.sprites.container.depth);
            console.log('[Debug] Container visible:', this.sprites.container.visible);
        }
        console.log('[Debug] ========================================');
    }

    /**
     * 关闭弹窗
     */
    close() {
        console.log('[PopupScene] Closing popup');

        // 销毁所有精灵
        Object.values(this.sprites).forEach((value) => this._destroySpriteValue(value));
        this.sprites = {};

        // 恢复所有其他场景的输入
        const scenes = this.scene.manager.getScenes(true);
        scenes.forEach(s => {
            if (s !== this && s.input) {
                s.input.enabled = true;
            }
        });

        // 调用回调
        if (this._onCloseCallback) {
            this._onCloseCallback();
            this._onCloseCallback = null;
        }

        // 停止此场景
        this.scene.stop();
        console.log('[PopupScene] Popup closed');
    }

    /**
     * 销毁单个精灵或精灵数组
     * @param {any} value
     */
    _destroySpriteValue(value) {
        if (!value) return;

        if (Array.isArray(value)) {
            value.forEach((child) => {
                if (child && typeof child.destroy === 'function') child.destroy();
            });
            return;
        }

        if (typeof value.destroy === 'function') {
            value.destroy();
        }
    }
};
