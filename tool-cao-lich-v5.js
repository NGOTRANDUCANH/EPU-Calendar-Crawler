(function() {
    // Bản V5: Giỏ hàng + Xử lý đa năm (2026 - 2027+) + Nhắc nhở 9h tối
    let storageKey = "EPU_Calendar_Data";
    let gomLich = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    let dateMap = {};
    let headers = document.querySelectorAll("table thead th, table tr:first-child th, table tr:first-child td");
    headers.forEach((th, index) => {
        let match = th.innerText.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (match) dateMap[index] = match[1]; 
    });

    let tds = document.querySelectorAll("table tbody td, table tr td");
    let newEvents = 0;

    tds.forEach(td => {
        let text = td.innerText.trim();
        if (text.includes("Giờ:") && text.includes("Phòng:") && text.includes("Tiết:")) {
            let lines = text.split('\n').map(l => l.trim()).filter(l => l);
            let subject = lines[0]; 
            let timeLine = lines.find(l => l.startsWith("Giờ:"));
            let roomLine = lines.find(l => l.startsWith("Phòng:"));
            let gvLine = lines.find(l => l.startsWith("GV:"));
            
            if (timeLine) {
                let [start, end] = timeLine.replace("Giờ:", "").split("-").map(t => t.trim());
                let cellIndex = td.cellIndex;
                let dateStr = dateMap[cellIndex] || dateMap[cellIndex + 1] || dateMap[cellIndex - 1]; 
                
                if (dateStr) {
                    let uniqueKey = `${subject}_${dateStr}_${start}`;
                    if (!gomLich.some(e => e.key === uniqueKey)) {
                        gomLich.push({
                            key: uniqueKey, subject: subject, dateStr: dateStr,
                            start: start, end: end,
                            room: roomLine ? roomLine.replace("Phòng:", "").trim() : "Chưa rõ phòng",
                            gv: gvLine ? gvLine.replace("GV:", "").trim() : ""
                        });
                        newEvents++;
                    }
                }
            }
        }
    });

    localStorage.setItem(storageKey, JSON.stringify(gomLich));
    
    console.clear();
    console.log(`%c🔥 Đã gom thêm ${newEvents} môn của tuần này!`, "color: green; font-size: 16px; font-weight: bold;");
    console.log(`%c📊 Tổng số sự kiện đang có trong giỏ: ${gomLich.length}`, "color: blue; font-size: 14px; font-weight: bold;");
    console.log(`👉 Hãy ấn [ Tiếp > ] trên web để sang tuần sau.`);
    console.log(`👉 Sau đó ấn phím "Mũi tên Lên ⬆️" rồi "Enter" ở Console để gom tiếp.`);
    console.log(`✅ KHI NÀO XONG HẾT, GÕ LỆNH NÀY ĐỂ TẢI FILE: xuatLichV5()`);
    
    window.xuatLichV5 = function() {
        if (gomLich.length === 0) {
            alert("Giỏ hàng đang trống! Bạn chưa cào được môn nào."); return;
        }
        
        function generateUID() { return Math.random().toString(36).substring(2) + Date.now().toString(36) + "@epu.edu.vn"; }
        let now = new Date();
        let dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Tool by Gemini//VN\r\nCALSCALE:GREGORIAN\r\n";
        
        gomLich.forEach(ev => {
            let [d, m, y] = ev.dateStr.split('/');
            
            // Ép kiểu sang số nguyên chuẩn (Base 10) để tránh lỗi parse năm tương lai
            let day = parseInt(d, 10);
            let month = parseInt(m, 10) - 1; // JS Date bắt đầu tháng từ 0 (tháng 1 = 0)
            let year = parseInt(y, 10);
            
            let startHour = parseInt(ev.start.split(':')[0], 10);
            let startMin = parseInt(ev.start.split(':')[1], 10);
            
            // Format chuẩn iCal (Bắt buộc)
            let startIso = `${y}${m}${d}T${ev.start.replace(':', '')}00`;
            let endIso = `${y}${m}${d}T${ev.end.replace(':', '')}00`;
            
            // TÍNH TOÁN NGÀY THÁNG BẤT CHẤP CHUYỂN NĂM (Native JS Handle)
            let classTime = new Date(year, month, day, startHour, startMin);
            let alarmTime = new Date(year, month, day, 21, 0); 
            alarmTime.setDate(alarmTime.getDate() - 1); // JS sẽ tự biết lùi năm nếu đang là 1/1
            
            let diffMinutes = Math.round((classTime - alarmTime) / 60000);

            ics += "BEGIN:VEVENT\r\n";
            ics += `UID:${generateUID()}\r\n`;
            ics += `DTSTAMP:${dtstamp}\r\n`;
            ics += `SUMMARY:${ev.subject}\r\n`;
            ics += `DTSTART;TZID=Asia/Ho_Chi_Minh:${startIso}\r\n`;
            ics += `DTEND;TZID=Asia/Ho_Chi_Minh:${endIso}\r\n`;
            ics += `LOCATION:${ev.room}\r\n`;
            ics += `DESCRIPTION:Giảng viên: ${ev.gv}\\n(Tạo bằng AI - Code V5 Bất Tử) =))\r\n`;
            
            // Khối hẹn giờ chuẩn
            ics += "BEGIN:VALARM\r\n";
            ics += "ACTION:DISPLAY\r\n";
            ics += `DESCRIPTION:Nhắc lịch học ngày mai!\r\n`;
            ics += `TRIGGER:-PT${diffMinutes}M\r\n`; 
            ics += "END:VALARM\r\n";

            ics += "END:VEVENT\r\n";
        });
        
        ics += "END:VCALENDAR\r\n";
        
        let blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        let url = window.URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = "LichHoc_EPU_V5_BatTu.ics";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        alert(`Thành công rực rỡ! Đã xuất ${gomLich.length} sự kiện. Bất chấp năm nhuận, vắt năm nha =)))`);
        localStorage.removeItem(storageKey); // Xóa giỏ hàng cho sạch sẽ
    };
})();
