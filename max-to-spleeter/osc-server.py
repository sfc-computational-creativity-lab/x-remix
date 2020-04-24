

import os
from pythonosc import osc_server
from pythonosc.dispatcher import Dispatcher
from pythonosc.udp_client import SimpleUDPClient
from spleeter.separator import Separator
import threading, time

ip = "127.0.0.1"
server_port = 8889
max_port = 12002

# クライアントを作る
client = SimpleUDPClient(ip, max_port)

# root folder
stems_folder = "/tmp/stems"

# ターゲットのファイルパス
target_path = None

# 生存確認 - ひたすら定期的にメッセージを送る
def send_heartbeat():
    while True:
        client.send_message("/ping", 1)
        time.sleep(2)
th = threading.Thread(target=send_heartbeat)
th.start()


def stem_separation(file_path):    
    folder_name = os.path.splitext(os.path.basename(file_path))[0]
    print(folder_name)
    separator = Separator("spleeter:4stems")
    separator.separate_to_file(file_path, stems_folder)
    bass_path = stems_folder + "/" + folder_name + "/bass.wav"
    drums_path = stems_folder + "/" + folder_name + "/drums.wav"
    other_path = stems_folder + "/" + folder_name + "/other.wav"
    vocals_path = stems_folder + "/" + folder_name + "/vocals.wav"
    return [bass_path, drums_path, other_path, vocals_path]


def send_osc(message):
    client.send_message("/stems", message)


def path_handler(unused_addr, filepath):
    global target_path
    """ 値を受信したときに行う処理 """
    print(f"recieved path: {filepath}")
    target_path = filepath

def start_handler(unused_addr, value):
    if target_path is None:
        print("set filepath before processing")
        return
    
    client.send_message("/processing", 1)

    stems_path_array = []
    # if __name__ == "__main__":
    stems_path_array = stem_separation(target_path)
    print("separation Finished")

    send_osc(stems_path_array)
    client.send_message("/processing", 0)
    print("Sent")


# URLにコールバック関数を割り当てる
dispatcher = Dispatcher()
dispatcher.map("/path", path_handler)
dispatcher.map("/start", start_handler)

# サーバを起動する
server = osc_server.ThreadingOSCUDPServer((ip, server_port), dispatcher)
print(f"Listening on {server.server_address}")
server.serve_forever()

