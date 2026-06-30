/**
 * S12 - 池塘特写（鱼/锯子）
 * manifest key: '15'
 * 点击鱼 → 鱼逐条消失 → 锯子露出 → 获取锯子 → 池塘点亮。
 * P1：点击鱼即消失，全部消失后显示锯子。
 */
window.QW = window.QW || {};

QW.PondFishScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'PondFish' });
        this.MANIFEST_KEY = '15';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
        // 背包道具图标（木头）跨场景显示
        QW.AssetLoaderInstance.loadSceneAssets('13');
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;
        this.sawSprite = null;
        this.bgSprite = null;
        this.pondSprite = null;
        this.fishSprites = [];

        // 背景（根据池塘是否点亮选择）
        if (GS.getFlag('pondLitUp')) {
            this.bgSprite = factory.createBackground(this.MANIFEST_KEY, '15/亮背景.png');
        } else {
            this.bgSprite = factory.createBackground(this.MANIFEST_KEY, '15/原背景.png');
        }

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 返回箭头：池塘点亮后，返回室内直接落到 LivingRoomA
        const backTargetScene = GS.getFlag('pondLitUp') ? 'LivingRoomA' : undefined;
        this.navigationArrows = new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            showBack: true,
            backTargetScene
        });

        // 池塘底层（根据状态）
        if (GS.getFlag('pondLitUp')) {
            this.pondSprite = factory.create(this.MANIFEST_KEY, '15/亮池塘（在鱼上.png');
        } else {
            this.pondSprite = factory.create(this.MANIFEST_KEY, '15/原池塘（在鱼图层上.png');
        }

        // 鱼 × 3（或点亮鱼）
        const fishNames = ['鱼1.png', '鱼2.png', '鱼3.png'];
        const fishLitNames = ['鱼亮1.png', '鱼亮2.png', '鱼亮3.png'];

        if (GS.getFlag('pondLitUp')) {
            // 池塘已点亮 → 显示亮色鱼（不可交互）
            for (let i = 0; i < 3; i++) {
                this.fishSprites[i] = factory.create(this.MANIFEST_KEY, `15/${fishLitNames[i]}`);
            }
        } else if (GS.getFlag('sawAcquired')) {
            // 锯子已获取但池塘尚未点亮 — 不应发生，但防御
            console.warn('[S12] Unexpected state: saw acquired but pond not lit');
        } else {
            // 原始态 → 点击逐条点亮
            for (let i = 0; i < 3; i++) {
                if (GS.flags.fishClicked[i]) {
                    // 已点亮
                    factory.create(this.MANIFEST_KEY, `15/${fishLitNames[i]}`);
                    continue;
                }
                const idx = i;
                const fishSprite = factory.createInteractive(this.MANIFEST_KEY, `15/${fishNames[i]}`,
                    () => {
                        console.log(`[S12] Fish ${idx + 1} clicked → lit`);
                        GS.flags.fishClicked[idx] = true;
                        if (fishSprite) fishSprite.destroy();
                        this.fishSprites[idx] = factory.create(this.MANIFEST_KEY, `15/${fishLitNames[idx]}`);
                        this._showSawIfReady(factory, GS);
                    }
                );
                this.fishSprites[i] = fishSprite;
            }

            this._showSawIfReady(factory, GS);
        }

        QW.TransitionManager.finishEnter(this);
    }

    _showSawIfReady(factory, GS) {
        if (!GS.allFishClicked() || GS.getFlag('sawAcquired')) return;
        if (this.sawSprite && this.sawSprite.active) return;

        this.sawSprite = factory.createInteractive(this.MANIFEST_KEY, '15/锯子.png',
            () => {
                console.log('[S12] Saw acquired → pond lights up');
                GS.addItem('saw');
                GS.setFlag('sawAcquired', true);
                GS.setFlag('pondLitUp', true);
                if (this.navigationArrows && this.navigationArrows.config) {
                    this.navigationArrows.config.backTargetScene = 'LivingRoomA';
                }

                if (this.inventoryDisplay) this.inventoryDisplay.refresh();
                if (this.sawSprite) this.sawSprite.destroy();

                // 无缝切亮，不重启场景
                const litBgKey = QW.AssetLoaderInstance.getKey(this.MANIFEST_KEY, '15/亮背景.png');
                const litPondKey = QW.AssetLoaderInstance.getKey(this.MANIFEST_KEY, '15/亮池塘（在鱼上.png');
                if (this.bgSprite && litBgKey) this.bgSprite.setTexture(litBgKey);
                if (this.pondSprite && litPondKey) this.pondSprite.setTexture(litPondKey);
            }
        );
    }
};
