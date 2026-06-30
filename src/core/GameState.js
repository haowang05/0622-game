/**
 * GameState — 全局状态单例
 * 管理道具获取、剧情标志位、导航历史。
 * 每个场景在 create() 中读取 flags 来决定渲染哪个版本的素材。
 */
window.QW = window.QW || {};

QW.GameState = {

    /* -------- 道具背包 -------- */
    inventory: {
        key: false,          // I01 钥匙
        wateringCan: false,  // I02 水壶
        wood: false,         // I03 木头
        saw: false,          // I04 锯子
        hammer: false,       // I05 锤子
        nail: false          // I06 钉子
    },

    /* -------- 剧情标志位 -------- */
    flags: {
        // 住所入口
        mailboxOpened: false,
        doorUnlocked: false,

        // 客厅C面
        cabinetOpened: false,
        wateringCanAcquired: false,
        waterFilled: false,        // 水壶已接水
        wateringCanSelected: false, // 水壶已选中

        // 客厅B面
        flowersWatered: false,
        photo1Taken: false,
        cameraIconShown: false,    // 相机icon已显示

        // 花园仰望 S10
        flowersLit: [false, false, false, false, false],
        cloudsLit: [false, false, false],
        gardenPhotoTaken: false,
        woodAcquired: false,

        // 池塘 S12
        fishClicked: [false, false, false],
        sawAcquired: false,
        pondLitUp: false,

        // 花园+池塘 S11
        gardenComplete: false,   // 花园+池塘全部完成

        // 卧室/密码
        passwordSolved: false,
        passwordReadyToOpen: false,
        diaryRead: false,
        passwordLooted: false,

        // 修沙发步骤
        sofaWoodPlaced: false,    // 已放置木头原
        sofaSawPlaced: false,     // 已放置锯子原
        sofaWoodSplit: false,     // 木头已切开（木头分开）
        sofaWoodResidual: false,  // 显示“留下的木料”
        sofaWoodMounted: false,   // 木料已吸附到沙发腿
        sofaWoodCut: false,      // 锯子+木头
        sofaNailPlaced: false,   // 钉子放到沙发上
        sofaHammerPlaced: false, // 锤子放到沙发上
        sofaNailHits: 0,         // 敲钉子次数 (0~3)
        sofaRepaired: false,     // 修复完成

        // 拍照
        photosTaken: 0,          // 0~3

        // 流程
        introCompleted: false,
        letterRead: false,
        commissionAccepted: false,
        gameCompleted: false,
        endingNotebookUnlocked: false
    },

    /* -------- 导航历史栈 -------- */
    sceneHistory: [],

    /* ======== 操作方法 ======== */

    /** 设置标志位 */
    setFlag(key, value) {
        if (value === undefined) value = true;
        if (key in this.flags) {
            this.flags[key] = value;
        } else {
            console.warn('[GameState] 未知标志位:', key);
        }
    },

    /** 读取标志位 */
    getFlag(key) {
        return this.flags[key] || false;
    },

    /** 获取道具 */
    addItem(itemKey) {
        if (itemKey in this.inventory) {
            this.inventory[itemKey] = true;
        }
    },

    /** 检查是否拥有道具 */
    hasItem(itemKey) {
        return this.inventory[itemKey] === true;
    },

    /** 消耗道具（一次性道具） */
    consumeItem(itemKey) {
        this.inventory[itemKey] = false;
    },

    /** 推入导航历史 */
    pushScene(sceneKey) {
        this.sceneHistory.push(sceneKey);
    },

    /** 弹出上一个场景 */
    popScene() {
        return this.sceneHistory.length > 0
            ? this.sceneHistory.pop()
            : null;
    },

    /** 花园仰望：检查花+云是否全部点亮 */
    allGardenLit() {
        return this.flags.flowersLit.every(v => v) &&
               this.flags.cloudsLit.every(v => v);
    },

    /** 池塘：检查鱼是否全部点击 */
    allFishClicked() {
        return this.flags.fishClicked.every(v => v);
    },

    /** 客厅三面循环：点亮后 C 面由 LivingRoomReturn 替代 */
    isLivingRoomLit() {
        return !!(this.getFlag('pondLitUp') || this.getFlag('gardenComplete'));
    },

    getLivingRoomPeers() {
        if (this.isLivingRoomLit()) {
            // 鱼塘点亮后，客厅循环中移除 LivingRoomB
            return ['LivingRoomA', 'LivingRoomReturn'];
        }
        return ['LivingRoomB', 'LivingRoomA', 'LivingRoomC'];
    },

    /** 重置全部状态（调试用） */
    reset() {
        Object.keys(this.inventory).forEach(k => this.inventory[k] = false);
        Object.keys(this.flags).forEach(k => {
            if (Array.isArray(this.flags[k])) {
                this.flags[k] = this.flags[k].map(() => false);
            } else if (typeof this.flags[k] === 'number') {
                this.flags[k] = 0;
            } else {
                this.flags[k] = false;
            }
        });
        this.sceneHistory = [];
    }
};
