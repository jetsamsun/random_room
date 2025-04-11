<?php
// 引入Redis配置
require_once 'config.php';

// 设置响应头
header('Content-Type: application/json');

// 获取请求数据
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// 检查请求数据
if (!$data || !isset($data['action'])) {
    echo json_encode(['success' => false, 'message' => '无效请求']);
    exit;
}

// 连接Redis
$redis = connectRedis();
if (!$redis) {
    echo json_encode(['success' => false, 'message' => 'Redis连接失败']);
    exit;
}

// 处理不同类型的请求
switch ($data['action']) {
    case 'send':
        handleSendMessage($redis, $data);
        break;
    case 'get':
        handleGetMessages($redis, $data);
        break;
    case 'system':
        handleSystemMessage($redis, $data);
        break;
    default:
        echo json_encode(['success' => false, 'message' => '未知操作']);
}

// 处理发送消息
function handleSendMessage($redis, $data) {
    // 验证必要参数
    if (!isset($data['room']) || !isset($data['username']) || !isset($data['message'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }
    
    $room = $data['room'];
    $username = $data['username'];
    $message = $data['message'];
    $timestamp = $data['timestamp'] ?? time() * 1000;
    
    // 生成消息ID
    $messageId = generateMessageId($room);
    
    // 创建消息对象
    $messageObj = [
        'id' => $messageId,
        'username' => $username,
        'message' => $message,
        'timestamp' => $timestamp,
        'type' => 'message'
    ];
    
    // 将消息存入Redis
    $key = "room:{$room}:messages";
    $redis->zAdd($key, $messageId, json_encode($messageObj));
    
    // 设置过期时间
    $redis->expire($key, MESSAGE_EXPIRY);
    
    // 返回成功
    echo json_encode(['success' => true, 'message_id' => $messageId]);
}

// 处理获取消息
function handleGetMessages($redis, $data) {
    // 验证必要参数
    if (!isset($data['room']) || !isset($data['username'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }
    
    $room = $data['room'];
    $lastId = isset($data['last_id']) ? intval($data['last_id']) : 0;
    
    // 获取新消息
    $key = "room:{$room}:messages";
    $messages = $redis->zRangeByScore($key, $lastId + 1, '+inf', ['withscores' => true]);
    
    $result = [];
    $newLastId = $lastId;
    
    foreach ($messages as $message => $score) {
        $messageObj = json_decode($message, true);
        $result[] = $messageObj;
        
        if ($messageObj['id'] > $newLastId) {
            $newLastId = $messageObj['id'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'messages' => $result,
        'last_id' => $newLastId
    ]);
}

// 处理系统消息
function handleSystemMessage($redis, $data) {
    // 验证必要参数
    if (!isset($data['room']) || !isset($data['username']) || !isset($data['type'])) {
        echo json_encode(['success' => false, 'message' => '参数不完整']);
        return;
    }
    
    $room = $data['room'];
    $username = $data['username'];
    // $type = $data['type'];
    $message = $data['message'];
    $timestamp = $data['timestamp'] ?? time() * 1000;
    
    // 生成消息ID
    $messageId = generateMessageId($room);
    
    // 创建消息对象
    $messageObj = [
        'id' => $messageId,
        'username' => 'System',
        'message' => $message,
        'timestamp' => $timestamp,
        'type' => 'system'
    ];
    
    // 将消息存入Redis
    $key = "room:{$room}:messages";
    $redis->zAdd($key, $messageId, json_encode($messageObj));
    
    // 设置过期时间
    $redis->expire($key, MESSAGE_EXPIRY);
    
    echo json_encode(['success' => true]);
}