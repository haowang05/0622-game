/**
 * InteractionHelper — 道具激活判定工具
 * 统一处理“拥有道具 + 已激活（选中）”的交互门禁逻辑。
 */
window.QW = window.QW || {};

QW.InteractionHelper = {
    /**
     * 道具激活所对应的 GameState 标志位映射
     */
    itemSelectionFlags: {
        wateringCan: 'wateringCanSelected'
    },

    /**
     * 是否拥有指定道具
     * @param {string} itemKey
     * @returns {boolean}
     */
    hasItem(itemKey) {
        return !!(QW.GameState && QW.GameState.hasItem(itemKey));
    },

    /**
     * 道具是否处于激活状态
     * - 若该道具没有激活标志位映射，默认只要求“拥有”即可
     * @param {string} itemKey
     * @returns {boolean}
     */
    isItemActivated(itemKey) {
        if (!this.hasItem(itemKey)) return false;

        const flagKey = this.itemSelectionFlags[itemKey];
        if (!flagKey) return true;

        return !!QW.GameState.getFlag(flagKey);
    },

    /**
     * 统一门禁：要求道具已激活
     * @param {string} itemKey
     * @param {object} [opts]
     * @param {Function} [opts.onBlocked] - 未通过时回调，入参 reason
     * @returns {boolean}
     */
    requireActivatedItem(itemKey, opts = {}) {
        if (!this.hasItem(itemKey)) {
            if (opts.onBlocked) opts.onBlocked('missingItem');
            return false;
        }

        const flagKey = this.itemSelectionFlags[itemKey];
        if (flagKey && !QW.GameState.getFlag(flagKey)) {
            if (opts.onBlocked) opts.onBlocked('notActivated');
            return false;
        }

        return true;
    }
};
