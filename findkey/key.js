// Cập nhật Offset từ file encryption_helper.dart bạn cung cấp
var offsets = {
    // Nhóm tạo Key/IV (Chỉ chạy 1 lần hoặc khi cần key mới)
    createKey: 0x68ffa4,      // createKeyFromHexString
    createIV: 0x68feb8,       // createIVFromHexString
    
    // Nhóm AES (Chạy liên tục)
    encryptString: 0x6cad60,  // AESEncryptFromString (Nghi vấn số 1)
    decryptString: 0x6668ac,  // AESDecryptFromHexString
    decryptBytes: 0xb811b0,   // AESDecryptFromByte
    
    // Nhóm RSA (Thường dùng cho Login để gửi Password)
    encryptRSA: 0xbe2b4c      // encryptRSA
};

var libName = "libapp.so"; 

function hookAll() {
    var baseAddr = Module.findBaseAddress(libName);
    
    if (!baseAddr) {
        console.log("[-] Chưa tìm thấy " + libName + ". Đợi xíu...");
        setTimeout(hookAll, 1000);
        return;
    }
    
    console.log("==================================================");
    console.log("[+] Đã tìm thấy " + libName + " tại: " + baseAddr);
    console.log("[+] Đang đặt bẫy tại 6 vị trí...");
    console.log("==================================================");

    // Hàm tiện ích để hook và in thông tin chuẩn Dart
    function attachHook(name, offset) {
        try {
            Interceptor.attach(baseAddr.add(offset), {
                onEnter: function(args) {
                    console.log("\n[" + name + "] Được gọi!");
                    
                    // Trong Dart ARM64:
                    // args[0] = Thread/Context (Thường không quan trọng)
                    // args[1] = Function Object / Receiver (Class Instance)
                    // args[2] = Tham số thứ 1 (Dữ liệu chúng ta cần!)
                    // args[3] = Tham số thứ 2...

                    // Dump args[2] (Thường là input string/byte)
                    console.log("-> Input (x2): " + args[2]);
                    try {
                        // Thử đọc như chuỗi Dart (Header + Length + Data)
                        // Pattern chung: Data thường cách con trỏ khoảng 8-16 bytes
                        console.log(hexdump(ptr(args[2]).add(0x8), { length: 512, header: false, ansi: true }));
                    } catch (e) {
                        console.log("   (Không thể hexdump x2)");
                    }

                    // Dump args[3] (Nếu có tham số thứ 2 như Key/IV)
                    if (!args[3].isNull()) {
                         console.log("-> Arg 2 (x3): " + args[3]);
                         try {
                            console.log(hexdump(ptr(args[3]).add(0x8), { length:128, header: false, ansi: true }));
                         } catch(e) {}
                    }
                },
                onLeave: function(retval) {
                    // Xem kết quả trả về (Ciphertext hoặc Plaintext giải mã)
                    console.log("[" + name + "] Trả về (Retval): " + retval);
                    try {
                        console.log(hexdump(retval.add(0x8), { length: 512, header: false, ansi: true }));
                    } catch (e) {}
                }
            });
        } catch (e) {
            console.log("[-] Lỗi hook " + name + ": " + e.message);
        }
    }

    // Thực hiện Hook
    attachHook("Tạo Key (createKey)", offsets.createKey);
    attachHook("Tạo IV (createIV)", offsets.createIV);
    attachHook("AES Encrypt (String)", offsets.encryptString);
    attachHook("AES Decrypt (String)", offsets.decryptString);
    attachHook("AES Decrypt (Byte)", offsets.decryptBytes);
    attachHook("RSA Encrypt", offsets.encryptRSA);
}

setImmediate(hookAll);
