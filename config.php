<?php
// Redis配置
$redis_config = [
    'host' => '127.0.0.1',
    'port' => 6379,
    'password' => 'zoFUJ6EzxyWTI0K8', // 如果有密码，请填写
    'database' => 14
];

// 连接Redis
function connectRedis() {
    global $redis_config;
    
    try {
        $redis = new Redis();
        $redis->connect($redis_config['host'], $redis_config['port']);
        
        // 如果有密码，进行认证
        if (!empty($redis_config['password'])) {
            $redis->auth($redis_config['password']);
        }
        
        // 选择数据库
        $redis->select($redis_config['database']);
        
        return $redis;
    } catch (Exception $e) {
        return null;
    }
}

// 生成消息ID
function generateMessageId($room) {
    $redis = connectRedis();
    if (!$redis) {
        return time() . rand(1000, 9999);
    }
    
    $key = "room:{$room}:message_id";
    $id = $redis->incr($key);
    // 设置该键的有效期为 60 秒  
    $redis->expire($key, 28800); 

    return $id;
}

// 消息过期时间（24小时，单位：秒）
define('MESSAGE_EXPIRY', 10);