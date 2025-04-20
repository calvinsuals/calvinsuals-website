// 通用图库更新脚本 - 用于管理网站所有区域的图片
// 使用方法: 将此脚本放在项目根目录中，然后使用Node.js运行
// node update_all_galleries.js
//
// 本脚本支持以下区域的图片管理：
// 1. 汽车页面 - 10个画廊 (gallery_01至gallery_10)
// 2. 人像页面 - 8个画廊 (gallery_01至gallery_08)
// 3. 主页展示区 - 2个子区域:
//    - display_automotive (汽车展示)
//    - display_portrait (人像展示)
// 4. 主页对比区 - 3组对比图:
//    - group_01 (第1组对比)
//    - group_02 (第2组对比)
//    - group_03 (第3组对比)
// 5. 主页轮播区 - hero文件夹
// 6. 关于我区域 - about文件夹
//
// 所有图片将按照文件名末尾的1-3位数字从小到大排序

const fs = require('fs');
const path = require('path');

// 支持的图片格式
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 图库配置
const GALLERIES = [
    // 汽车页面galleries
    {
        basePath: 'images/automotive',
        galleryCount: 10,
        folderPrefix: 'gallery_',
        type: 'json',
        createMainJson: true
    },
    // 人像页面galleries
    {
        basePath: 'images/portrait',
        galleryCount: 8,
        folderPrefix: 'gallery_',
        type: 'json',
        createMainJson: true
    },
    // 主页hero轮播
    {
        basePath: 'images/hero',
        galleryCount: 1,
        folderPrefix: '',
        type: 'json',
        createMainJson: true
    },
    // 主页comparison区域
    {
        basePath: 'images/comparison',
        galleryCount: 3,
        folderPrefix: 'group_',
        type: 'json',
        createMainJson: true
    },
    // about区域
    {
        basePath: 'images/about',
        galleryCount: 1,
        folderPrefix: '',
        type: 'json',
        createMainJson: true
    },
    // display区域 - 分为automotive和portrait两个子区域
    {
        basePath: 'images/display',
        galleryCount: 2,
        folderPrefix: 'display_',
        folderNames: ['automotive', 'portrait'],
        type: 'json',
        createMainJson: true
    }
];

// 按照文件名的最后3位数字排序
function sortByNumberSuffix(files) {
    return files.sort((a, b) => {
        // 提取文件名（不含扩展名）
        const nameA = path.basename(a, path.extname(a));
        const nameB = path.basename(b, path.extname(b));
        
        // 获取最后3位数字，如果不存在则默认为0
        const getLastThreeDigits = (filename) => {
            // 从文件名中提取数字
            const match = filename.match(/(\d{1,3})$/);
            if (match) {
                return parseInt(match[1], 10);
            }
            return 0; // 如果没有数字，则返回0
        };
        
        const numA = getLastThreeDigits(nameA);
        const numB = getLastThreeDigits(nameB);
        
        // 按数字从小到大排序
        return numA - numB;
    });
}

// 解决中文乱码问题的函数
function writeJsonWithBOM(filePath, data) {
    // 将JSON转为字符串并添加BOM (Byte Order Mark)
    // BOM可以让Windows更容易识别文件为UTF-8编码
    const jsonString = JSON.stringify(data, null, 2);
    const bomPrefix = Buffer.from([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const jsonBuffer = Buffer.from(jsonString, 'utf8');
    const fileContent = Buffer.concat([bomPrefix, jsonBuffer]);
    
    try {
        fs.writeFileSync(filePath, fileContent);
        return true;
    } catch (err) {
        console.error(`写入JSON文件失败: ${filePath}`, err);
        return false;
    }
}

// 处理简单类型的图库（仅images.json列表）
function processSimpleGallery(gallery) {
    const { basePath, galleryCount, folderPrefix, folderNames } = gallery;
    
    // 检查是否有子文件夹前缀
    if (folderPrefix && galleryCount > 1) {
        // 多组简单画廊模式（如comparison的3组对比图或display的两个类别）
        const results = [];
        
        for (let i = 1; i <= galleryCount; i++) {
            // 获取文件夹名称，优先使用folderNames数组中的名称（如果存在）
            let folderName;
            if (folderNames && folderNames[i-1]) {
                folderName = `${folderPrefix}${folderNames[i-1]}`;
            } else {
                const groupNumber = i.toString().padStart(2, '0');
                folderName = `${folderPrefix}${groupNumber}`;
            }
            
            const groupPath = path.join(basePath, folderName);
            
            try {
                // 确保目录存在
                if (!fs.existsSync(groupPath)) {
                    console.log(`创建目录: ${groupPath}`);
                    fs.mkdirSync(groupPath, { recursive: true });
                }
                
                // 获取目录中的所有图片
                const files = fs.readdirSync(groupPath);
                const imageFiles = files.filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return SUPPORTED_EXTENSIONS.includes(ext);
                }).filter(file => !file.startsWith('.') && !file.endsWith('.json')); // 排除隐藏文件和JSON文件
                
                // 排序图片
                const sortedImages = sortByNumberSuffix(imageFiles);
                
                // 创建/更新每个组的images.json
                const jsonPath = path.join(groupPath, 'images.json');
                // 使用BOM编码写入
                writeJsonWithBOM(jsonPath, sortedImages);
                
                console.log(`已更新 ${groupPath}: 找到 ${sortedImages.length} 张图片`);
                results.push({ path: folderName, count: sortedImages.length });
                
            } catch (error) {
                console.error(`处理 ${groupPath} 时出错:`, error);
                results.push({ path: folderName, error: error.toString() });
            }
        }
        
        // 如果需要创建主images.json文件，将所有子组的第一张图片收集起来
        if (gallery.createMainJson) {
            try {
                const mainImages = [];
                
                // 从每个子组中提取第一张图片
                for (let i = 1; i <= galleryCount; i++) {
                    // 获取文件夹名称，优先使用folderNames数组中的名称（如果存在）
                    let folderName;
                    if (folderNames && folderNames[i-1]) {
                        folderName = `${folderPrefix}${folderNames[i-1]}`;
                    } else {
                        const groupNumber = i.toString().padStart(2, '0');
                        folderName = `${folderPrefix}${groupNumber}`;
                    }
                    
                    const groupPath = path.join(basePath, folderName);
                    const jsonPath = path.join(groupPath, 'images.json');
                    
                    if (fs.existsSync(jsonPath)) {
                        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                        if (data && data.length > 0) {
                            // 构建相对路径
                            const imagePath = `${folderName}/${data[0]}`;
                            mainImages.push(imagePath);
                        }
                    }
                }
                
                // 创建主images.json
                if (mainImages.length > 0) {
                    const mainJsonPath = path.join(basePath, 'images.json');
                    // 使用BOM编码写入
                    writeJsonWithBOM(mainJsonPath, mainImages);
                    console.log(`已创建主索引文件 ${basePath}/images.json，包含 ${mainImages.length} 张图片`);
                }
            } catch (error) {
                console.error(`创建主索引文件 ${basePath}/images.json 时出错:`, error);
            }
        }
        
        return results;
    } else {
        // 单一简单画廊模式（如hero、about等）
        try {
            // 确保目录存在
            if (!fs.existsSync(basePath)) {
                console.log(`创建目录: ${basePath}`);
                fs.mkdirSync(basePath, { recursive: true });
            }
            
            // 获取目录中的所有图片
            const files = fs.readdirSync(basePath);
            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return SUPPORTED_EXTENSIONS.includes(ext);
            }).filter(file => !file.startsWith('.') && !file.endsWith('.json')); // 排除隐藏文件和JSON文件
            
            // 排序图片
            const sortedImages = sortByNumberSuffix(imageFiles);
            
            // 创建/更新images.json
            const jsonPath = path.join(basePath, 'images.json');
            // 使用BOM编码写入
            writeJsonWithBOM(jsonPath, sortedImages);
            
            console.log(`已更新 ${basePath}: 找到 ${sortedImages.length} 张图片`);
            return { success: true, count: sortedImages.length };
            
        } catch (error) {
            console.error(`处理 ${basePath} 时出错:`, error);
            return { success: false, error };
        }
    }
}

// 处理子画廊
async function processSubGallery(config, folderName, jsonFileName) {
    const galleryPath = path.join(config.basePath, folderName);
    const jsonFilePath = path.join(galleryPath, jsonFileName);
    
    // 确保目录存在
    if (!fs.existsSync(galleryPath)) {
        console.log(`创建目录: ${galleryPath}`);
        fs.mkdirSync(galleryPath, { recursive: true });
    }
    
    // 读取或创建JSON数据结构
    let galleryData;
    if (fs.existsSync(jsonFilePath)) {
        try {
            // 检查文件是否为UTF-8 BOM编码
            const fileContent = fs.readFileSync(jsonFilePath);
            // 去除BOM头
            const contentStr = fileContent.toString('utf8').replace(/^\uFEFF/, '');
            galleryData = JSON.parse(contentStr);
        } catch (err) {
            console.error(`读取JSON文件失败: ${jsonFilePath}`, err);
            galleryData = { title: folderName.charAt(0).toUpperCase() + folderName.slice(1), images: [] };
        }
    } else {
        // 创建新的JSON结构
        if (config.basePath.includes('automotive') || config.basePath.includes('portrait')) {
            galleryData = { title: `画廊 ${folderName.replace(/[^0-9]/g, '')}`, images: [] };
        } else if (config.basePath.includes('comparison')) {
            const groupNum = folderName.replace(/[^0-9]/g, '');
            galleryData = { title: `对比组 ${groupNum}`, images: [] };
        } else if (config.basePath.includes('display')) {
            if (folderName === 'automotive') {
                galleryData = { title: '汽车展示', images: [] };
            } else if (folderName === 'portrait') {
                galleryData = { title: '人像展示', images: [] };
            } else {
                galleryData = { title: folderName.charAt(0).toUpperCase() + folderName.slice(1), images: [] };
            }
        } else {
            galleryData = { title: `画廊 ${folderName.replace(/[^0-9]/g, '')}`, images: [] };
        }
    }
    
    // 获取目录中的所有图片
    const files = fs.readdirSync(galleryPath);
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_EXTENSIONS.includes(ext);
    }).filter(file => !file.startsWith('.') && !file.endsWith('.json')); // 排除隐藏文件和JSON文件
    
    // 排序图片
    const sortedImages = sortByNumberSuffix(imageFiles);
    
    // 更新画廊的图片列表
    galleryData.images = sortedImages;
    
    // 保存更新后的JSON（使用BOM编码）
    const success = writeJsonWithBOM(jsonFilePath, galleryData);
    if (success) {
        console.log(`已更新画廊 ${galleryPath}: 找到 ${sortedImages.length} 张图片`);
        return { success: true, count: sortedImages.length };
    } else {
        return { success: false, error: "写入失败" };
    }
}

// 处理JSON类型的图库（gallery_xx.json结构）
async function processJsonGallery(config) {
    console.log(`处理JSON类型画廊: ${config.basePath}`);

    // 处理总画廊配置
    if (config.createMainJson) {
        const mainJsonFile = path.join(config.basePath, 'galleries.json');
        let mainGalleries = [];
        
        // 根据配置创建总画廊配置
        if (config.folderNames && config.folderNames.length > 0) {
            // 如果有指定的文件夹名
            for (let i = 0; i < config.folderNames.length; i++) {
                const folderName = config.folderNames[i];
                const folderPath = path.join(config.basePath, folderName);
                
                try {
                    if (!fs.existsSync(folderPath)) {
                        console.log(`创建文件夹: ${folderPath}`);
                        fs.mkdirSync(folderPath, { recursive: true });
                    }
                } catch (err) {
                    console.error(`创建文件夹失败: ${folderPath}`, err);
                    continue;
                }
                
                // 确定要使用的JSON文件名
                let jsonFileName;
                if (config.basePath.includes('automotive') || config.basePath.includes('portrait')) {
                    jsonFileName = `gallery_${(i+1).toString().padStart(2, '0')}.json`;
                } else if (config.basePath.includes('comparison')) {
                    jsonFileName = `group_${(i+1).toString().padStart(2, '0')}.json`;
                } else if (config.basePath.includes('display')) {
                    jsonFileName = `${folderName}.json`;
                } else {
                    jsonFileName = `gallery_${(i+1).toString().padStart(2, '0')}.json`;
                }

                // 为不同文件夹设置合适的标题
                let galleryTitle;
                if (folderName === 'automotive') {
                    galleryTitle = '汽车展示';
                } else if (folderName === 'portrait') {
                    galleryTitle = '人像展示';
                } else {
                    galleryTitle = folderName.charAt(0).toUpperCase() + folderName.slice(1);
                }
                
                mainGalleries.push({
                    id: folderName,
                    title: galleryTitle,
                    jsonFile: jsonFileName
                });
                
                // 处理每个子画廊
                try {
                    await processSubGallery(config, folderName, jsonFileName);
                } catch (err) {
                    console.error(`处理子画廊失败: ${folderName}`, err);
                }
            }
        } else {
            // 使用数字序列的文件夹
            for (let i = 1; i <= config.galleryCount; i++) {
                const folderNumber = i.toString().padStart(2, '0');
                const folderName = `${config.folderPrefix}${folderNumber}`;
                const folderPath = path.join(config.basePath, folderName);
                
                try {
                    if (!fs.existsSync(folderPath)) {
                        console.log(`创建文件夹: ${folderPath}`);
                        fs.mkdirSync(folderPath, { recursive: true });
                    }
                } catch (err) {
                    console.error(`创建文件夹失败: ${folderPath}`, err);
                    continue;
                }
                
                // 确定要使用的JSON文件名
                let jsonFileName;
                if (config.basePath.includes('automotive') || config.basePath.includes('portrait')) {
                    jsonFileName = `gallery_${folderNumber}.json`;
                } else if (config.basePath.includes('comparison')) {
                    jsonFileName = `group_${folderNumber}.json`;
                } else if (config.basePath.includes('display')) {
                    jsonFileName = `display_${folderNumber}.json`;
                } else {
                    jsonFileName = `gallery_${folderNumber}.json`;
                }
                
                // 为不同类型画廊设置合适的标题
                let galleryTitle;
                if (config.basePath.includes('comparison')) {
                    galleryTitle = `对比组 ${i}`;
                } else if (config.basePath.includes('display')) {
                    galleryTitle = `展示 ${i}`;
                } else {
                    galleryTitle = `画廊 ${i}`;
                }
                
                mainGalleries.push({
                    id: folderName,
                    title: galleryTitle,
                    jsonFile: jsonFileName
                });
                
                // 处理每个子画廊
                try {
                    await processSubGallery(config, folderName, jsonFileName);
                } catch (err) {
                    console.error(`处理子画廊失败: ${folderName}`, err);
                }
            }
        }
        
        // 写入总画廊配置文件
        try {
            console.log(`写入主画廊配置: ${mainJsonFile}`);
            // 使用BOM编码写入
            writeJsonWithBOM(mainJsonFile, mainGalleries);
        } catch (err) {
            console.error(`写入主画廊配置失败: ${mainJsonFile}`, err);
        }
    } else {
        // 直接处理子画廊
        for (let i = 1; i <= config.galleryCount; i++) {
            const folderNumber = i.toString().padStart(2, '0');
            const folderName = `${config.folderPrefix}${folderNumber}`;
            
            // 根据不同的画廊类型确定JSON文件名
            let jsonFileName;
            if (config.basePath.includes('automotive') || config.basePath.includes('portrait')) {
                jsonFileName = `gallery_${folderNumber}.json`;
            } else if (config.basePath.includes('comparison')) {
                jsonFileName = `group_${folderNumber}.json`;
            } else if (config.basePath.includes('display')) {
                jsonFileName = `display_${folderNumber}.json`;
            } else {
                jsonFileName = `gallery_${folderNumber}.json`;
            }
            
            try {
                await processSubGallery(config, folderName, jsonFileName);
            } catch (err) {
                console.error(`处理子画廊失败: ${folderName}`, err);
            }
        }
    }
}

// 处理所有图库
async function processAllGalleries() {
    console.log('===== 开始更新所有图库 =====');
    
    for (const gallery of GALLERIES) {
        console.log(`\n----- 处理图库: ${gallery.basePath} -----`);
        
        if (gallery.type === 'simple') {
            processSimpleGallery(gallery);
        } else if (gallery.type === 'json') {
            processJsonGallery(gallery);
        }
    }
    
    console.log('\n===== 所有图库更新完成 =====');
}

// 执行更新
processAllGalleries().catch(err => {
    console.error('处理图库时出错:', err);
}); 