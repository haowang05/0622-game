/**
 * AssetLoader — 素材加载器
 * 读取 manifest.json，提供按场景加载素材、路径转换等功能。
 *
 * 关键设计：
 *   - manifest.json 中的 output_path 使用 Windows 反斜杠（cropped\1\xxx.png）
 *     本模块自动转换为 URL 正斜杠
 *   - Phaser 的 texture key 使用唯一路径字符串，避免跨场景 key 冲突
 *   - 素材按需加载：启动时只加载 icons + 主菜单，切换场景时加载目标场景素材
 */
window.QW = window.QW || {};

QW.AssetLoader = class {

    /**
     * @param {Phaser.Scene} bootScene - 用于执行 load 的初始场景
     */
    constructor(bootScene) {
        this.scene = bootScene;
        this.manifest = null;
        this.basePath = 'assets/';  // 相对于 index.html
        this.loadedScenes = new Set();
        this.iconsLoaded = false;
        this.hasPendingLoads = false;  // loadSceneAssets 是否实际添加了新文件
    }

    /* ======== 初始化 ======== */

    /**
     * 绑定当前活跃场景（每个场景在 preload 开头调用）
     * Phaser 的 LoaderPlugin 绑定在特定 scene 上，
     * BootScene 销毁后需要重新绑定到当前场景。
     * @param {Phaser.Scene} scene
     */
    bindScene(scene) {
        this.scene = scene;
        this.hasPendingLoads = false;  // 重置
    }

    /**
     * 加载 manifest.json（在 preload 中调用，之后需 scene.load.start()）
     */
    loadManifest() {
        this.scene.load.json('manifest', this.basePath + 'manifest.json');
    }

    /**
     * 解析 manifest（在 create 或 load complete 回调中调用）
     */
    parseManifest() {
        this.manifest = this.scene.cache.json.get('manifest');
        return this.manifest;
    }

    /* ======== 路径转换 ======== */

    /**
     * 将 manifest 中的 output_path 转为 Web URL
     * cropped\1\背景.png → assets/cropped/1/背景.png
     * 注意：浏览器会自动编码中文文件名，无需手动 encode
     */
    toUrl(outputPath) {
        return this.basePath + outputPath.replace(/\\/g, '/');
    }

    /**
     * 生成唯一的 Phaser texture key
     * 直接使用 output_path（已含场景文件夹名，天然唯一）
     */
    toKey(outputPath) {
        return outputPath.replace(/\\/g, '/');
    }

    /* ======== 查询 ======== */

    /**
     * 获取某个 manifest scene key 下所有素材条目
     * @param {string} sceneKey - manifest 中的 key，如 '1', '5,7', '14，16'
     * @returns {object|null}
     */
    getSceneEntries(sceneKey) {
        if (!this.manifest) return null;
        return this.manifest.scenes[sceneKey] || null;
    }

    /**
     * 获取单条素材的 manifest 信息
     * @param {string} sceneKey
     * @param {string} assetName - 如 "1/start 未选择.png"
     * @returns {object|null}
     */
    getAssetInfo(sceneKey, assetName) {
        const entries = this.getSceneEntries(sceneKey);
        return entries ? entries[assetName] || null : null;
    }

    /**
     * 获取画布尺寸
     */
    getCanvasSize() {
        return this.manifest
            ? { width: this.manifest.canvas.width, height: this.manifest.canvas.height }
            : { width: 2800, height: 1840 };
    }

    /* ======== 加载 ======== */

    /**
     * 加载指定 manifest scene key 的全部素材
     * 在场景的 preload() 中调用，Phaser 会自动排队加载
     * @param {string} sceneKey
     */
    loadSceneAssets(sceneKey) {
        if (this.loadedScenes.has(sceneKey)) return;
        const entries = this.getSceneEntries(sceneKey);
        if (!entries) {
            console.warn('[AssetLoader] 场景 key 不存在:', sceneKey);
            return;
        }
        let queued = 0;
        for (const [name, info] of Object.entries(entries)) {
            const key = this.toKey(info.output_path);
            const url = this.toUrl(info.output_path);
            if (!this.scene.textures.exists(key)) {
                this.scene.load.image(key, url);
                queued++;
            }
        }
        if (queued > 0) this.hasPendingLoads = true;
        this.loadedScenes.add(sceneKey);
        console.log(`[AssetLoader] Loaded scene "${sceneKey}": ${queued} assets queued`);
    }

    /**
     * 加载全局 UI 图标素材（菜单栏、箭头等）
     */
    loadIcons() {
        if (this.iconsLoaded) return;
        this.loadSceneAssets('图标');
        // 全局预加载常用道具图标，避免跨场景背包图标丢失
        this.loadSceneAssets('5,7');   // 钥匙
        this.loadSceneAssets('10');    // 水壶
        this.loadSceneAssets('13');    // 木头
        this.loadSceneAssets('15');    // 锯子
        this.loadSceneAssets('19');    // 锤子/钉子
        this.loadSceneAssets('22');    // 修沙发与物品选中态
        this.iconsLoaded = true;
    }

    /**
     * 加载根级素材（色谱等）
     */
    loadRoot() {
        this.loadSceneAssets('_root');
    }

    /* ======== 精灵创建辅助 ======== */

    /**
     * 获取纹理 key（用于 sprite 创建）
     * @param {string} sceneKey
     * @param {string} assetName
     * @returns {string|null}
     */
    getKey(sceneKey, assetName) {
        const info = this.getAssetInfo(sceneKey, assetName);
        return info ? this.toKey(info.output_path) : null;
    }

    /**
     * 获取精灵定位数据（x, y 中心坐标）
     * @param {string} sceneKey
     * @param {string} assetName
     * @returns {{ x: number, y: number, width: number, height: number }|null}
     */
    getPosition(sceneKey, assetName) {
        const info = this.getAssetInfo(sceneKey, assetName);
        if (!info) return null;
        return {
            x: info.offset.x + info.width / 2,
            y: info.offset.y + info.height / 2,
            width: info.width,
            height: info.height
        };
    }
};
