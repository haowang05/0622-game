/**
 * InventoryDisplay — 道具展示系统
 * P1 阶段为 stub 版本，仅提供接口框架。
 *
 * 设计：背包无单独面板，道具图标直接显示在底部菜单栏区域内。
 * 道具在菜单栏中的位置参考各道具图标的 manifest offset。
 *
 * 道具状态：
 *   - 未选中：显示 "xx道具未选择.png"
 *   - 选中：显示 "xx选择.png"（高亮放大）
 */
window.QW = window.QW || {};

QW.InventoryDisplay = class {

    /**
     * @param {Phaser.Scene} scene
     * @param {QW.SpriteFactory} factory
     * @param {string} manifestKey - 当前场景 manifest key
     * @param {number} [depth=101] - 在菜单栏(depth 100)之上
     */
    constructor(scene, factory, manifestKey, depth) {
        this.scene = scene;
        this.factory = factory;
        this.manifestKey = manifestKey;
        this.depth = depth || 101;
        this.sprites = {};
        
        // 从GameState恢复选中状态
        this.selectedItem = QW.GameState.getFlag('wateringCanSelected') ? 'wateringCan' : null;

        // 道具配置映射：道具key -> {未选择素材名, 选择素材名, manifestKey}
        this.itemConfig = {
            key: {
                normal: '5,7/钥匙道具.png',
                selected: '5,7/钥匙选择.png',
                manifestKey: '5,7'
            },
            wateringCan: {
                normal: '10/壶道具未选择.png',
                selected: '10/壶选择.png',
                manifestKey: '10'
            },
            wood: {
                normal: '13/木头道具未选择.png',
                selected: '22/物品/木头选择.png',
                manifestKey: '13',
                selectedManifestKey: '22'
            },
            saw: {
                normal: '15/锯子道具未选择.png',
                selected: '22/物品/锯子选择.png',
                manifestKey: '15',
                selectedManifestKey: '22'
            },
            hammer: {
                normal: '19/锤子道具未选择.png',
                selected: '22/物品/锤子选择.png',
                manifestKey: '19',
                selectedManifestKey: '22'
            },
            nail: {
                normal: '19/钉子道具未选择.png',
                selected: '22/物品/钉子选择.png',
                manifestKey: '19',
                selectedManifestKey: '22'
            }
        };

        // 初始化时创建所有道具图标
        this._initItems();

        // 立即刷新显示，根据 GameState 显示已拥有的道具
        this.refresh();
    }

    /**
     * 初始化所有道具图标（隐藏状态）
     */
    _initItems() {
        console.log('[Inventory] Initializing items. Config:', this.itemConfig);
        
        for (const [itemKey, config] of Object.entries(this.itemConfig)) {
            console.log(`[Inventory] Creating item: ${itemKey}, manifestKey: ${config.manifestKey}, asset: ${config.normal}`);
            
            // 先创建未选择状态的图标，默认为不可见
            const sprite = this.factory.create(config.manifestKey, config.normal, {
                depth: this.depth
            });
            
            if (sprite) {
                console.log(`[Inventory] Created sprite for ${itemKey}:`, sprite);
                sprite.setVisible(false);
                sprite.setInteractive();
                sprite.setData('itemKey', itemKey);

                // 点击道具图标时选中
                sprite.on('pointerdown', () => {
                    console.log(`[Inventory] Item clicked: ${itemKey}`);
                    this.selectItem(itemKey);
                });

                this.sprites[itemKey] = sprite;
            } else {
                console.warn(`[Inventory] Failed to create sprite for ${itemKey}`);
            }
        }
    }

    /**
     * 根据 GameState.inventory 刷新道具显示
     */
    refresh() {
        const inv = QW.GameState.inventory;
        console.log('[Inventory] Refreshing display. Inventory:', inv);

        for (const [itemKey, hasItem] of Object.entries(inv)) {
            const sprite = this.sprites[itemKey];
            console.log(`[Inventory] Processing ${itemKey}: hasItem=${hasItem}, sprite=${sprite ? 'exists' : 'null'}`);
            
            if (!sprite) continue;

            if (hasItem) {
                // 拥有该道具，显示
                sprite.setVisible(true);
                console.log(`[Inventory] Showing item: ${itemKey}`);

                // 根据是否选中切换素材
                const config = this.itemConfig[itemKey];
                if (config) {
                    const isSelected = this.selectedItem === itemKey;
                    const assetName = isSelected ? config.selected : config.normal;
                    const lookupManifestKey = isSelected
                        ? (config.selectedManifestKey || config.manifestKey)
                        : config.manifestKey;
                    const textureKey = QW.AssetLoaderInstance.getKey(lookupManifestKey, assetName);
                    console.log(`[Inventory] Switching texture for ${itemKey}:`, assetName, '->', textureKey);
                    
                    if (textureKey) {
                        sprite.setTexture(textureKey);
                    } else {
                        console.warn(`[Inventory] Texture key not found for ${assetName}`);
                    }
                }
            } else {
                // 没有该道具，隐藏
                sprite.setVisible(false);
                console.log(`[Inventory] Hiding item: ${itemKey}`);
            }
        }
    }

    /**
     * 选中道具
     * @param {string} itemKey
     */
    selectItem(itemKey) {
        // 如果点击已选中的道具，则取消选中
        if (this.selectedItem === itemKey) {
            this.deselect();
            return;
        }

        this.selectedItem = itemKey;
        
        // 同步到GameState（目前仅水壶有门禁逻辑）
        QW.GameState.setFlag('wateringCanSelected', itemKey === 'wateringCan');
        
        this.refresh();
        console.log('[Inventory] 选中:', itemKey);
    }

    /**
     * 取消选中
     */
    deselect() {
        const prevItem = this.selectedItem;
        this.selectedItem = null;
        
        // 同步到GameState
        if (prevItem === 'wateringCan') {
            QW.GameState.setFlag('wateringCanSelected', false);
        }
        
        this.refresh();
        console.log('[Inventory] 取消选中');
    }

    /**
     * 获取当前选中的道具
     * @returns {string|null}
     */
    getSelected() {
        return this.selectedItem;
    }

    /** 销毁所有精灵 */
    destroy() {
        Object.values(this.sprites).forEach(s => {
            if (s) s.destroy();
        });
        this.sprites = {};
    }
};
