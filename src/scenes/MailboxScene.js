/**
 * S5 - 邮箱交互
 * manifest key: '6'
 */
window.QW = window.QW || {};

QW.MailboxScene = class extends Phaser.Scene {
    constructor() {
        super({ key: 'Mailbox' });
        this.MANIFEST_KEY = '6';
    }

    preload() {
        QW.AssetLoaderInstance.bindScene(this);
        QW.AssetLoaderInstance.loadSceneAssets(this.MANIFEST_KEY);
        QW.AssetLoaderInstance.loadSceneAssets('5,7');
    }

    create() {
        const factory = new QW.SpriteFactory(this, QW.AssetLoaderInstance);
        const GS = QW.GameState;

        factory.createBackground(this.MANIFEST_KEY);
        new QW.MenuBar(this, factory, this.MANIFEST_KEY);
        this.inventoryDisplay = new QW.InventoryDisplay(this, factory, this.MANIFEST_KEY);

        new QW.NavigationArrows(this, factory, this.MANIFEST_KEY, {
            showBack: true
        });

        const mailboxOpened = GS.getFlag('mailboxOpened');
        const hasKeyInInventory = GS.hasItem('key');

        if (mailboxOpened) {
            if (!hasKeyInInventory) {
                factory.createInteractive(this.MANIFEST_KEY, '6/邮箱开.png',
                    () => this._takeKey(factory)
                );
            } else {
                factory.create(this.MANIFEST_KEY, '6/邮箱空.png');
            }
        } else {
            factory.createInteractive(this.MANIFEST_KEY, '6/邮箱关.png',
                () => this._openMailbox()
            );
        }

        QW.TransitionManager.finishEnter(this);
    }

    _openMailbox() {
        QW.showPhotoPopup(this, {
            manifestKey: this.MANIFEST_KEY,
            containerName: '6/弹窗.png',
            closeName: '6/X.png',
            dimAlpha: 0.55,
            onClose: () => {
                QW.GameState.setFlag('mailboxOpened', true);
                this.scene.restart();
            }
        });
    }

    _takeKey(factory) {
        QW.GameState.addItem('key');
        this.scene.restart();
    }
};
