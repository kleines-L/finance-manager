const fs = require('fs');

function readCSV(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    const parserInstance = new parser();

    lines.forEach((line, index) => {
        const days = parserInstance.get_timeframe(line);
        const balance = parserInstance.get_balance(line);
        const open_withdrawals = parserInstance.get_open_withdrawals(line);
        const expenses = parserInstance.get_expenses(line);
        const income = parserInstance.get_income(line);
        const date_range = parserInstance.get_date_range(line);
    });
}

class parser {
    /* 
    "27.08.2025";"27.08.2025";"Lastschrift / Belastung";"Auftraggeber: REWE (KT) Frankfur Buchungstext: REWE (KT) Frankfur, Frankfurt am D E Karte Nr. 4871 78XX XXXX 6800 Kartenzahlung comdirect Visa-Debitkarte 2025-08-25 00:00:00 Ref. 602C21MZ13ZN7IX6/25769";"-1,68";
    "25.08.2025";"25.08.2025";"Kartenverf�gung";" Buchungstext: SP WOMIER KEYBOARD, WOMIERKEYBOAR US Karte Nr. 4871 78XX XXXX 6800 Kartenzahlung comdirect Visa-Debitkarte 2025-08-22 00:00:00 Ref. 4H2C21MX1DMH669U/67801";"-93,56";
    */
    get_expenses(line) {
        if (line.includes(`"Lastschrift / Belastung"`) || line.includes(`"Kartenverf�gung"`)) {
            let parts = line.split(';');
            let money = parts[4];
            money = money.replace(/"/g, '').trim();

            let merchant = parts[3];
            merchant = merchant.replace(/"/g, '').trim();
            if (merchant.includes('Buchungstext: ')) {
                merchant = merchant.split('Buchungstext: ')[1].trim();
                merchant = merchant.split(' Karte Nr.')[0].trim();
            }

            let date = parts[0];
            date = date.replace(/"/g, '').trim();

            let timestamp = "///";
            const timestampMatch = merchant.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            if (timestampMatch) {
                timestamp = timestampMatch[0];
                merchant = merchant.split(timestampMatch[0])[0].trim();
            }

            console.log(`\x1b[31mExpense:\x1b[0m Money: \x1b[33m${money}\x1b[0m, Date: \x1b[35m${date}\x1b[0m, Merchant: \x1b[36m${merchant}\x1b[0m`);
            return [merchant, money, date, timestamp];
        }
    }


    /* 
    "30.07.2025";"30.07.2025";"�bertrag / �berweisung";"Auftraggeber: GKM Interactive UG Buchungstext: 9A Ref. D75C21KA27QW8H82/1";"360,00";
    "28.07.2025";"28.07.2025";"�bertrag / �berweisung";"Auftraggeber: Elena Toaca Buchungstext: Taschengeld Ref. 7F2C21K82V4C37G8/20831";"250,00";
    */
    get_income(line) {
        if (line.includes(`"�bertrag / �berweisung"`)) {
            let parts = line.split(';');
            let money = parts[4];
            money = money.replace(/"/g, '').trim();
            
            if (money.startsWith('-')) {
                return;
            }

            let source = parts[3];
            source = source.replace(/"/g, '').trim();
            if (source.includes('Auftraggeber: ')) {
                source = source.split('Auftraggeber: ')[1].trim();
                source = source.split(' Buchungstext:')[0].trim();
            }

            let date = parts[0];
            date = date.replace(/"/g, '').trim();

            console.log(`\x1b[32mIncome:\x1b[0m Money: \x1b[33m${money}\x1b[0m, Date: \x1b[35m${date}\x1b[0m, Source: \x1b[36m${source}\x1b[0m`);
            return [source, money, date];
        }
    }


    get_balance(line) {
        if (line.startsWith(`"Neuer Kontostand";`)) { // "Neuer Kontostand";"1.235,91 EUR";
            let parts = line.split(';');
            let money = parts[1];
            money = money.replace(/"/g, '').trim();
            money = money.replace(' EUR', '€').trim();
            console.log(`Balance: \x1b[33m${money}\x1b[0m`);
            return money;
        }
    }

    get_open_withdrawals(line) {
        if (line.startsWith(`"offen";"--";`)) {
            let parts = line.split(';');
            let money = parts[4];
            money = money.replace(/"/g, '').trim();

            let merchant = parts[3];
            merchant = merchant.replace(/"/g, '').trim();
            merchant = merchant.split('Buchungstext: ')[1].trim();

            let timestamp = "///";
            const timestampMatch = merchant.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            if (timestampMatch) {
                timestamp = timestampMatch[0];
                merchant = merchant.replace(timestampMatch[0], '').trim();
            }
            console.log(`\x1b[32mOpen Withdrawals:\x1b[0m Money: \x1b[33m${money}\x1b[0m, Merchant: \x1b[36m${merchant}\x1b[0m, Time: \x1b[35m${timestamp}\x1b[0m`);
            return [merchant, money, timestamp]
        }
    }

    get_timeframe(line) {
        if (line.includes('Zeitraum:')) {
            if (line.includes('Tagesgeld')) {
                return false;
            }
            const parts = line.split(';');
            const zeitraumPart = parts[1];
            const cleanZeitraum = zeitraumPart.replace(/"/g, '');
            const days = cleanZeitraum.match(/\d+/)[0];
            console.log(`\x1b[34mTimeframe (days): Last ${days} Days\x1b[0m`);
            return days;
        }
    }

    get_date_range(line) {
        if (line.includes('Zeitraum:')) {
            if (line.includes('Tagesgeld')) {
                return false;
            }
            const parts = line.split(';');
            const zeitraumPart = parts[1];
            const cleanZeitraum = zeitraumPart.replace(/"/g, '');
            const days = cleanZeitraum.match(/\d+/)[0];
            
            const dates = this.extract_all_dates();
            const oldestDate = dates.length > 0 ? dates[dates.length - 1] : 'N/A';
            const newestDate = dates.length > 0 ? dates[0] : 'N/A';
            
            // console.log(`\x1b[34mTimeframe (days): Last ${days} Days\x1b[0m`);
            console.log(`\x1b[34mDate Range: ${oldestDate} to ${newestDate}\x1b[0m`);
            
            return { days, oldestDate, newestDate };
        }
    }

    extract_all_dates() {
        const data = fs.readFileSync("C:\\Users\\elena\\Downloads\\umsaetze_5858439549_20250831-2235.csv", 'utf8');
        const lines = data.split('\n');
        const dates = [];
        
        lines.forEach(line => {
            if (line.startsWith('"') && line.includes('";') && !line.includes('Buchungstag') && !line.includes('Neuer Kontostand') && !line.includes('Zeitraum') && !line.includes('offen')) {
                const parts = line.split(';');
                if (parts.length >= 2) {
                    const dateStr = parts[0].replace(/"/g, '').trim();
                    if (dateStr.match(/\d{2}\.\d{2}\.\d{4}/)) {
                        dates.push(dateStr);
                    }
                }
            }
        });
        
        return dates;
    }
}



readCSV("C:\\Users\\elena\\Downloads\\umsaetze_5858439549_20250831-2235.csv");