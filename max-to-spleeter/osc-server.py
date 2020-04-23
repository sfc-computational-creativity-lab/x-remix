import os
from pythonosc import osc_server
from pythonosc.dispatcher import Dispatcher
from pythonosc.udp_client import SimpleUDPClient
from spleeter.separator import Separator


ip = "127.0.0.1"
server_port = 8888
max_port = 12000

stems_folder = "/Users/ryohasegawa/Documents/CC-Lab/x-remix/spleeter/stems"


def stem_separation(file_path):
    separator = Separator("spleeter:4stems")
    separator.separate_to_file(file_path, stems_folder)
    folder_name = os.path.splitext(os.path.basename(file_path))[0]
    bass_path = stems_folder + "/" + folder_name + "/bass.wav"
    drums_path = stems_folder + "/" + folder_name + "/drums.wav"
    other_path = stems_folder + "/" + folder_name + "/other.wav"
    vocals_path = stems_folder + "/" + folder_name + "/vocals.wav"
    return [bass_path, drums_path, other_path, vocals_path]


def send_osc(message):
    client = SimpleUDPClient(ip, max_port)
    client.send_message("/stems", message)


def path_handler(unused_addr, message):
    """ 値を受信したときに行う処理 """
    path = message.strip("Macintosh HD:")
    print(f"recieved path: {path}")

    stems_path_array = []
    # if __name__ == "__main__":
    stems_path_array = stem_separation(path)
    print("separation Finished")

    send_osc(stems_path_array)
    print("Sent")


# URLにコールバック関数を割り当てる
dispatcher = Dispatcher()
dispatcher.map("/path", path_handler)

# サーバを起動する
server = osc_server.ThreadingOSCUDPServer((ip, server_port), dispatcher)
print(f"Listening on {server.server_address}")
server.serve_forever()
