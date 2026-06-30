/**
 * S4 - Hugh 住所外景
 * manifest key: '5,7'
 * 门前场景 + 信箱。
 *   - 点击信箱 → MailboxScene（获取钥匙）
 *   - 选中钥匙 → 点击大门 → 开门 → LivingRoomA
 */
window.QW = window.QW || {};

QW.HouseExteriorScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'HouseExterior' });
        this.MANIFEST_KEY = '5,7';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
        // 加载道具图标所在的场景资源（钥匙等道具在 '5,7' 中）
        QW.AssetLoaderInstance.loadSceneAssets('5,7');
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;

        // 背景（根据门是否已开选择不同背景）
        if (GS.getFlag('doorUnlocked')) {
            factory.createBackground(this.MANIFEST_KEY, '5,7/背景1.png');
        } else {
            factory.createBackground(this.MANIFEST_KEY, '5,7/背景.png');
        }

        // 菜单栏
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);

        // 初始化道具显示系统
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        // 信箱（可点击 → 邮箱场景）
        factory.createInteractive(this.MANIFEST_KEY, '5,7/信箱.png',
            () => {
                console.log('[S4] Mailbox clicked → MailboxScene');
                QW.TransitionManager.goto(this, 'Mailbox');
            }
        );

        // 大门
        if (GS.getFlag('doorUnlocked')) {
            factory.createInteractive(this.MANIFEST_KEY, '5,7/开门.png',
                () => {
                    if (QW.AudioManager) QW.AudioManager.playDoor(this);
                    console.log('[S4] Door open → LivingRoomA');
                    QW.TransitionManager.goto(this, 'LivingRoomA');
                },
                { playClick: false }
            );
        } else {
            factory.createInteractive(this.MANIFEST_KEY, '5,7/门.png',
                () => this._tryOpenDoor(),
                { playClick: false }
            );
        }

        QW.TransitionManager.finishEnter(this);
    }

    _tryOpenDoor() {
        const selectedTool = this.inventoryDisplay ? this.inventoryDisplay.getSelected() : null;
        console.log('[S4] Try open door. Selected tool:', selectedTool);
        console.log('[S4] Has key in inventory:', QW.GameState.hasItem('key'));

        if (selectedTool === 'key') {
            console.log('[S4] Using key → door unlocked');
            if (QW.AudioManager) QW.AudioManager.playDoor(this);
            QW.GameState.setFlag('doorUnlocked', true);
            QW.GameState.consumeItem('key');
            // 取消选中
            if (this.inventoryDisplay) {
                this.inventoryDisplay.deselect();
            }
            // 重新渲染场景
            this.scene.restart();
        } else {
            console.log('[S4] Door locked, need to select key first. Current selection:', selectedTool);
            if (QW.AudioManager) QW.AudioManager.playSigh(this);
        }
    }
};
