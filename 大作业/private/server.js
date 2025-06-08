const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
const port = 3000;

// 创建数据库连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'cpu_info',
});

// 获取表格最后修改时间（使用information_schema.tables）
async function getTableLastUpdateTime(tableName) {
  try {
    const [rows] = await pool.execute(
      'SELECT UPDATE_TIME FROM information_schema.tables WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      ['cpu_info', tableName]
    );
    
    return rows.length > 0 ? rows[0].UPDATE_TIME : null;
  } catch (error) {
    console.error('获取表格状态错误:', error);
    return null;
  }
}

// 获取数据库最后修改时间
async function getDatabaseLastUpdateTime() {
  try {
    const [tables] = await pool.execute('SHOW TABLES');
    let lastUpdateTime = null;
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const tableUpdateTime = await getTableLastUpdateTime(tableName);
      if (tableUpdateTime && (!lastUpdateTime || tableUpdateTime > lastUpdateTime)) {
        lastUpdateTime = tableUpdateTime;
      }
    }
    return lastUpdateTime;
  } catch (error) {
    console.error('获取数据库状态错误:', error);
    return null;
  }
}

// 获取数据库最后修改时间的 API
app.get('/api/database-last-update', async (req, res) => {
  try {
    const lastUpdate = await getDatabaseLastUpdateTime();
    res.json({ lastUpdate });
  } catch (error) {
    console.error('数据库查询错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取显卡数据的API
app.get('/api/gpus', async (req, res) => {
  try {
    // 查询显卡数据
    const [gpus] = await pool.execute('SELECT * FROM gpus');
    const lastUpdate = await getTableLastUpdateTime('gpus');

    // 返回数据
    res.json({
      gpus,
      lastUpdate
    });
  } catch (error) {
    console.error('数据库查询错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 搜索API
app.get('/api/search', async (req, res) => {
  const keyword = req.query.keyword || '';
  
  try {
    // 搜索显卡数据
    const [gpus] = await pool.execute(
      'SELECT * FROM gpus WHERE 名称 LIKE ?', 
      [`%${keyword}%`]
    );
    const lastUpdate = await getTableLastUpdateTime('gpus');

    // 返回数据
    res.json({
      gpus,
      lastUpdate
    });
  } catch (error) {
    console.error('搜索查询错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取CPU数据的API
app.get('/api/cpus', async (req, res) => {
  try {
    // 查询CPU数据
    const [cpus] = await pool.execute('SELECT * FROM cpu_prices');
    const lastUpdate = await getTableLastUpdateTime('cpu_prices');

    // 返回数据
    res.json({
      cpus,
      lastUpdate
    });
  } catch (error) {
    console.error('数据库查询错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 搜索CPU数据的API
app.get('/api/cpu/search', async (req, res) => {
  const keyword = req.query.keyword || '';
  
  try {
    // 搜索CPU数据
    const [cpus] = await pool.execute(
      'SELECT * FROM cpu_prices WHERE 名称 LIKE ?', 
      [`%${keyword}%`]
    );
    const lastUpdate = await getTableLastUpdateTime('cpu_prices');

    // 返回数据
    res.json({
      cpus,
      lastUpdate
    });
  } catch (error) {
    console.error('搜索查询错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
});