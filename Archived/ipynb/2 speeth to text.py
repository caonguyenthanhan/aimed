import speech_recognition as sr
import pyaudio
import time
import threading
from colorama import Fore, Back, Style, init

# Khởi tạo colorama
init(autoreset=True)

def print_header():
    """In header đẹp mắt"""
    print(Fore.CYAN + Style.BRIGHT + "=" * 60)
    print(Fore.YELLOW + Style.BRIGHT + "🎤 CHUYỂN ĐỔI GIỌNG NÓI THÀNH VẢN BẢN 🎤")
    print(Fore.CYAN + Style.BRIGHT + "=" * 60)
    print()

def print_menu():
    """In menu lựa chọn ngôn ngữ"""
    print(Fore.GREEN + Style.BRIGHT + "📋 CHỌN NGÔN NGỮ:")
    print(Fore.WHITE + "   1️⃣  Tiếng Việt 🇻🇳")
    print(Fore.WHITE + "   2️⃣  English 🇺🇸")
    print(Fore.WHITE + "   3️⃣  Cài đặt Microphone 🎙️")
    print(Fore.WHITE + "   4️⃣  Thoát ❌")
    print()

def list_microphones():
    """Liệt kê tất cả microphone có sẵn"""
    print(Fore.CYAN + Style.BRIGHT + "\n🎙️ DANH SÁCH MICROPHONE CÓ SẴN:")
    print(Fore.CYAN + "=" * 50)
    
    mic_list = sr.Microphone.list_microphone_names()
    
    if not mic_list:
        print(Fore.RED + "❌ Không tìm thấy microphone nào!")
        return None
    
    for i, microphone_name in enumerate(mic_list):
        # Highlight microphone mặc định
        if i == 0:
            print(Fore.GREEN + f"   {i}️⃣  {microphone_name} " + Fore.YELLOW + "(Mặc định) ⭐")
        else:
            print(Fore.WHITE + f"   {i}️⃣  {microphone_name}")
    
    print(Fore.CYAN + "=" * 50)
    return mic_list

def select_microphone():
    """Cho phép người dùng chọn microphone"""
    mic_list = list_microphones()
    
    if not mic_list:
        return None
    
    print()
    while True:
        try:
            choice = input(Fore.MAGENTA + f"👉 Chọn microphone (0-{len(mic_list)-1}) hoặc 'q' để quay lại: ").strip()
            
            if choice.lower() == 'q':
                return None
            
            mic_index = int(choice)
            if 0 <= mic_index < len(mic_list):
                selected_mic = mic_list[mic_index]
                print(Fore.GREEN + f"✅ Đã chọn: {selected_mic}")
                time.sleep(1)
                return mic_index
            else:
                print(Fore.RED + f"❌ Vui lòng chọn số từ 0 đến {len(mic_list)-1}")
        except ValueError:
            print(Fore.RED + "❌ Vui lòng nhập số hợp lệ!")
        except KeyboardInterrupt:
            return None

def test_microphone(mic_index=None):
    """Test microphone đã chọn"""
    try:
        if mic_index is not None:
            mic = sr.Microphone(device_index=mic_index)
            mic_name = sr.Microphone.list_microphone_names()[mic_index]
        else:
            mic = sr.Microphone()
            mic_name = "Microphone mặc định"
        
        recognizer = sr.Recognizer()
        
        print(Fore.BLUE + f"🔧 Đang test microphone: {mic_name}")
        
        with mic as source:
            print(Fore.YELLOW + "🎯 Hãy nói 'xin chào' để test microphone...")
            recognizer.adjust_for_ambient_noise(source, duration=1)
            
            try:
                audio = recognizer.listen(source, timeout=5, phrase_time_limit=3)
                text = recognizer.recognize_google(audio, language='vi-VN')
                print(Fore.GREEN + f"✅ Test thành công! Nhận được: '{text}'")
                return True
            except sr.WaitTimeoutError:
                print(Fore.YELLOW + "⏰ Không có âm thanh trong 5 giây")
                return False
            except sr.UnknownValueError:
                print(Fore.YELLOW + "⚠️ Có âm thanh nhưng không nhận dạng được")
                return False
            except Exception as e:
                print(Fore.RED + f"❌ Lỗi test: {e}")
                return False
                
    except Exception as e:
        print(Fore.RED + f"❌ Không thể truy cập microphone: {e}")
        return False

def show_progress_bar(duration=10):
    """Hiển thị thanh tiến trình đếm ngược"""
    print(Fore.YELLOW + "⏳ Đang lắng nghe... Hãy nói trong vòng 10 giây!")
    
    for i in range(duration, 0, -1):
        # Tính toán thanh tiến trình
        progress = (duration - i + 1) / duration
        bar_length = 30
        filled_length = int(bar_length * progress)
        bar = "█" * filled_length + "░" * (bar_length - filled_length)
        
        # In thanh tiến trình
        print(f"\r{Fore.CYAN}[{bar}] {Fore.YELLOW}{i:2d}s {Fore.GREEN}🎙️", end="", flush=True)
        time.sleep(1)
    
    print(f"\r{Fore.RED}⏰ Hết thời gian chờ!                                    ")

def speech_to_text_with_progress(language='vi-VN', mic_index=None):
    """
    Chuyển đổi giọng nói thành văn bản với thanh tiến trình và microphone tùy chọn
    """
    recognizer = sr.Recognizer()
    
    try:
        # Sử dụng microphone đã chọn hoặc mặc định
        if mic_index is not None:
            microphone = sr.Microphone(device_index=mic_index)
            mic_name = sr.Microphone.list_microphone_names()[mic_index]
        else:
            microphone = sr.Microphone()
            mic_name = "Microphone mặc định"
        
        with microphone as source:
            print(Fore.BLUE + f"🔧 Đang điều chỉnh độ nhạy microphone: {mic_name}")
            recognizer.adjust_for_ambient_noise(source, duration=1)
            print(Fore.GREEN + "✅ Microphone đã sẵn sàng!")
            print()
            
            # Bắt đầu lắng nghe
            print(Fore.MAGENTA + "🎯 Bắt đầu ghi âm...")
            
            # Tạo thread cho thanh tiến trình
            progress_thread = threading.Thread(target=show_progress_bar, args=(10,))
            progress_thread.daemon = True
            progress_thread.start()
            
            # Lắng nghe âm thanh
            audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
            
            print(Fore.CYAN + "\n🔄 Đang xử lý âm thanh...")
            
            # Nhận dạng giọng nói
            if language == 'vi-VN':
                text = recognizer.recognize_google(audio, language='vi-VN')
                lang_name = "Tiếng Việt"
            else:
                text = recognizer.recognize_google(audio, language='en-US')
                lang_name = "English"
            
            # Hiển thị kết quả
            print(Fore.GREEN + Style.BRIGHT + "\n🎉 THÀNH CÔNG!")
            print(Fore.YELLOW + f"📝 Ngôn ngữ: {lang_name}")
            print(Fore.CYAN + f"🎙️ Microphone: {mic_name}")
            print(Fore.WHITE + Back.GREEN + f" Kết quả: {text} ")
            print()
            
            return text
            
    except sr.WaitTimeoutError:
        print(Fore.RED + "\n⏰ Không phát hiện giọng nói trong thời gian chờ!")
        return None
    except sr.UnknownValueError:
        print(Fore.RED + "\n❌ Không thể nhận dạng được âm thanh. Hãy thử nói rõ hơn!")
        return None
    except sr.RequestError as e:
        print(Fore.RED + f"\n🚫 Lỗi dịch vụ nhận dạng giọng nói: {e}")
        return None
    except Exception as e:
        print(Fore.RED + f"\n💥 Lỗi không xác định: {e}")
        return None

def microphone_settings():
    """Menu cài đặt microphone"""
    while True:
        import os
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print(Fore.CYAN + Style.BRIGHT + "=" * 60)
        print(Fore.YELLOW + Style.BRIGHT + "🎙️ CÀI ĐẶT MICROPHONE 🎙️")
        print(Fore.CYAN + Style.BRIGHT + "=" * 60)
        print()
        
        print(Fore.GREEN + Style.BRIGHT + "📋 TÙY CHỌN:")
        print(Fore.WHITE + "   1️⃣  Xem danh sách microphone 📋")
        print(Fore.WHITE + "   2️⃣  Chọn microphone 🎯")
        print(Fore.WHITE + "   3️⃣  Test microphone 🧪")
        print(Fore.WHITE + "   4️⃣  Quay lại menu chính ↩️")
        print()
        
        choice = input(Fore.CYAN + "👉 Nhập lựa chọn của bạn (1-4): ").strip()
        
        if choice == "1":
            list_microphones()
            input(Fore.MAGENTA + "\nNhấn Enter để tiếp tục...")
            
        elif choice == "2":
            mic_index = select_microphone()
            if mic_index is not None:
                global selected_microphone
                selected_microphone = mic_index
                print(Fore.GREEN + f"✅ Đã lưu cài đặt microphone!")
                time.sleep(2)
            
        elif choice == "3":
            mic_list = list_microphones()
            if mic_list:
                print()
                test_choice = input(Fore.MAGENTA + f"👉 Chọn microphone để test (0-{len(mic_list)-1}) hoặc Enter cho mặc định: ").strip()
                
                if test_choice == "":
                    test_microphone()
                else:
                    try:
                        mic_index = int(test_choice)
                        if 0 <= mic_index < len(mic_list):
                            test_microphone(mic_index)
                        else:
                            print(Fore.RED + "❌ Số không hợp lệ!")
                    except ValueError:
                        print(Fore.RED + "❌ Vui lòng nhập số!")
                
                input(Fore.MAGENTA + "\nNhấn Enter để tiếp tục...")
            
        elif choice == "4":
            break
        else:
            print(Fore.RED + "\n❌ Lựa chọn không hợp lệ!")
            time.sleep(1)

# Biến global để lưu microphone đã chọn
selected_microphone = None

def main():
    """Hàm chính với giao diện trực quan"""
    global selected_microphone
    
    while True:
        # Xóa màn hình (Windows)
        import os
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print_header()
        
        # Hiển thị microphone hiện tại
        if selected_microphone is not None:
            try:
                mic_name = sr.Microphone.list_microphone_names()[selected_microphone]
                print(Fore.GREEN + f"🎙️ Microphone hiện tại: {mic_name}")
            except:
                print(Fore.YELLOW + f"🎙️ Microphone hiện tại: Index {selected_microphone}")
        else:
            print(Fore.CYAN + "🎙️ Microphone hiện tại: Mặc định")
        print()
        
        print_menu()
        
        try:
            choice = input(Fore.CYAN + "👉 Nhập lựa chọn của bạn (1-4): ").strip()
            
            if choice == "1":
                print(Fore.GREEN + "\n🇻🇳 Đã chọn: Tiếng Việt")
                result = speech_to_text_with_progress('vi-VN', selected_microphone)
            elif choice == "2":
                print(Fore.GREEN + "\n🇺🇸 Đã chọn: English")
                result = speech_to_text_with_progress('en-US', selected_microphone)
            elif choice == "3":
                microphone_settings()
                continue
            elif choice == "4":
                print(Fore.YELLOW + "\n👋 Cảm ơn bạn đã sử dụng! Tạm biệt!")
                break
            else:
                print(Fore.RED + "\n❌ Lựa chọn không hợp lệ! Vui lòng chọn 1, 2, 3 hoặc 4.")
                time.sleep(2)
                continue
            
            # Hỏi có muốn thử lại không (chỉ cho lựa chọn 1 và 2)
            if choice in ["1", "2"]:
                print(Fore.CYAN + "\n" + "─" * 50)
                retry = input(Fore.MAGENTA + "🔄 Bạn có muốn thử lại? (y/n): ").strip().lower()
                
                if retry not in ['y', 'yes', 'có', 'c']:
                    print(Fore.YELLOW + "\n👋 Cảm ơn bạn đã sử dụng! Tạm biệt!")
                    break
                
        except KeyboardInterrupt:
            print(Fore.YELLOW + "\n\n👋 Chương trình đã được dừng. Tạm biệt!")
            break
        except Exception as e:
            print(Fore.RED + f"\n💥 Lỗi: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()