require('dotenv').config();
const { sql } = require('@vercel/postgres');

// ─── Realistic BC delivery data ───

const firstNames = ['James','John','Robert','Michael','David','William','Richard','Joseph','Thomas','Christopher','Daniel','Matthew','Anthony','Mark','Steven','Andrew','Paul','Joshua','Kenneth','Kevin','Brian','George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan','Jacob','Gary','Nicholas','Eric','Jonathan','Stephen','Larry','Justin','Scott','Brandon','Benjamin','Samuel','Patrick','Raymond','Gregory','Frank','Alexander','Jack','Dennis','Jerry','Tyler','Aaron','Nathan','Henry','Douglas','Peter','Adam','Zachary','Kyle','Noah','Ethan','Jeremy','Walter','Christian','Roger','Keith','Terry','Lawrence','Sean','Albert','Jesse','Austin','Bruce','Ralph','Roy','Dylan','Eugene','Russell','Bobby','Harry','Vincent','Philip','Louis','Carl','Johnny','Wayne','Alan','Juan','Howard','Arthur'];
const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes','Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper','Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson','Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes','Price','Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez','Powell','Jenkins','Perry','Russell','Sullivan','Bell','Coleman','Butler','Henderson','Barnes','Gonzales','Fisher','Vasquez','Simmons','Graham','Murray','Ford','Hamilton','Shaw','Chen','Singh','Okonkwo','Fontaine','Marchetti','Zhao','Park','Sharma','Olsen','Henshaw','Reeves','Petrov','Hassan','Wells'];

const vehicles = [
    '2024 BMW X5 xDrive40i - Alpine White','2023 Mercedes-Benz GLC 300 - Obsidian Black','2024 Toyota Camry XSE - Supersonic Red',
    '2023 Audi Q7 55 TFSI - Navarra Blue','2022 Tesla Model 3 Long Range - Midnight Silver','2021 Ford F-150 Lariat - Antimatter Blue',
    '2024 Hyundai Ioniq 5 - Lucid Blue','2023 Chevrolet Silverado 1500 RST - Summit White','2025 Honda CR-V Hybrid - Urban Gray',
    '2024 Mazda CX-50 Turbo - Zircon Sand','2023 Kia EV6 GT-Line - Yacht Blue','2024 Subaru Outback Wilderness - Autumn Green',
    '2025 Toyota RAV4 Prime SE - Blueprint','2024 Ford Bronco Sport Big Bend - Cactus Gray','2023 Lexus RX 350h - Eminent White',
    '2024 Volkswagen ID.4 Pro S - Moonstone Grey','2023 Honda Civic Si - Rallye Red','2024 Tesla Model Y - Pearl White',
    '2022 Ford Mustang GT - Shadow Black','2024 Chevrolet Equinox EV - Riptide Blue','2023 Toyota Tacoma TRD - Lunar Rock',
    '2024 Nissan Rogue SL - Everest White','2023 Jeep Grand Cherokee L - Diamond Black','2024 Hyundai Tucson Hybrid - Shimmering Silver',
    '2023 BMW 3 Series 330i - Portimao Blue','2024 Mercedes-Benz EQB - Denim Blue','2023 Audi e-tron GT - Mythos Black',
    '2024 Porsche Cayenne - Mahogany Metallic','2023 Volvo XC90 - Thunder Grey','2024 Land Rover Defender - Fuji White',
    '2023 Acura MDX Type S - Liquid Carbon','2024 Genesis GV70 - Savile Silver','2022 Dodge Ram 1500 - Granite Crystal',
    '2024 Rivian R1S - Forest Green','2023 Cadillac Escalade - Black Raven','2024 Lincoln Navigator - Pristine White',
    '2023 GMC Sierra Denali - Onyx Black','2024 Toyota Tundra TRD Pro - Solar Octane','2023 Infiniti QX60 - Moonbow Blue',
    '2024 Kia Telluride SX - Moss Green','2023 Mazda CX-90 PHEV - Rhodium White','2024 Hyundai Palisade - Moonlight Cloud',
    '2023 Chevrolet Corvette Stingray - Torch Red','2024 Ford Explorer ST - Forged Green','2023 Dodge Charger SRT - B5 Blue',
    '2024 Nissan Pathfinder SL - Gun Metallic','2023 Honda Passport TrailSport - Sonic Gray','2024 Subaru Ascent Touring - Crystal White',
    '2022 Ram 2500 Laramie - Bright White','2024 Toyota Crown - Supersonic Red','2023 BMW X3 M40i - Phytonic Blue',
    '2024 Audi Q5 Sportback - Ultra Blue','2023 Volvo XC60 - Crystal White','2024 Mercedes-Benz GLE 450 - Selenite Grey',
    '2023 Lexus NX 350h - Cloudburst Gray','2024 Porsche Macan - Gentian Blue','2023 Tesla Model X - Ultra White',
    '2024 Ford Maverick Lariat - Area 51 Blue','2022 Toyota Highlander - Celestial Silver','2024 Honda Pilot TrailSport - Diffused Sky Blue',
    '2023 Jeep Wagoneer - Bright White','2024 Chevrolet Tahoe RST - Sterling Grey','2023 GMC Yukon AT4 - Volcanic Red',
];

const bcRoutes = [
    // [pickup, delivery, distance, time, pay_min, pay_max]
    // Local Metro Vancouver
    ['1234 Marine Drive, West Vancouver, BC','8821 Granville St, Vancouver, BC', 18, 30, 55, 95],
    ['4500 Kingsway, Burnaby, BC','2200 Cambie St, Vancouver, BC', 12, 25, 45, 80],
    ['7899 Templeton Station Rd, Richmond, BC','1801 Lonsdale Ave, North Vancouver, BC', 22, 35, 60, 100],
    ['2525 Commercial Dr, Vancouver, BC','4850 Marine Dr, Burnaby, BC', 11, 20, 45, 75],
    ['10153 King George Blvd, Surrey, BC','3550 Lougheed Hwy, Coquitlam, BC', 31, 45, 65, 110],
    ['2330 Hawthorne Ave, Port Coquitlam, BC','8171 Ackroyd Rd, Richmond, BC', 28, 45, 60, 100],
    ['1188 West Georgia St, Vancouver, BC','2855 Pemberton Ave, North Vancouver, BC', 10, 20, 40, 75],
    ['15355 24 Ave, Surrey, BC','20395 Lougheed Hwy, Maple Ridge, BC', 35, 50, 70, 120],
    ['1055 Dunsmuir St, Vancouver, BC','6551 No. 3 Rd, Richmond, BC', 14, 25, 50, 85],
    ['2695 Granville St, Vancouver, BC','32555 London Ave, Mission, BC', 78, 90, 120, 195],
    ['7488 King George Blvd, Surrey, BC','1320 Johnston Rd, White Rock, BC', 18, 25, 50, 85],
    ['4700 Kingsway, Burnaby, BC','20202 66 Ave, Langley, BC', 38, 50, 75, 120],
    ['100 Braid St, New Westminster, BC','45600 Airport Rd, Chilliwack, BC', 102, 110, 150, 250],
    // Mid-range BC
    ['950 West Broadway, Vancouver, BC','3344 Cedar Hill Rd, Victoria, BC', 112, 180, 225, 350],
    ['2150 Western Pkwy, Vancouver, BC','1433 Fairfield Rd, Victoria, BC', 95, 150, 200, 320],
    ['7700 Edmonds St, Burnaby, BC','15622 Fraser Hwy, Surrey, BC', 22, 40, 55, 90],
    ['4700 Kingsway, Burnaby, BC','2041 Harvey Ave, Kelowna, BC', 390, 330, 450, 700],
    ['1055 Dunsmuir St, Vancouver, BC','900 McGill Rd, Kamloops, BC', 355, 300, 400, 650],
    ['555 Terminal Ave, Nanaimo, BC','1250 Shoppers Row, Campbell River, BC', 152, 210, 280, 450],
    ['6551 No. 3 Rd, Richmond, BC','1775 Harvey Ave, Kelowna, BC', 395, 340, 460, 720],
    ['2200 Cambie St, Vancouver, BC','385 St Paul St, Kamloops, BC', 360, 310, 420, 660],
    ['3025 Lougheed Hwy, Coquitlam, BC','710 Redbrick Ave, Kamloops, BC', 355, 300, 400, 650],
    // Long haul BC
    ['45925 Airport Rd, Chilliwack, BC','1502 Cedar Ave, Trail, BC', 485, 420, 550, 900],
    ['1234 Marine Drive, West Vancouver, BC','780 Blanshard St, Victoria, BC', 120, 190, 240, 375],
    ['290 City Centre, Kitimat, BC','4612 Park Ave, Terrace, BC', 61, 75, 100, 160],
    ['4700 Kingsway, Burnaby, BC','1300 Main St, Penticton, BC', 395, 340, 450, 700],
    ['1055 Dunsmuir St, Vancouver, BC','100 Cranbrook St N, Cranbrook, BC', 830, 690, 850, 1400],
    ['2200 Cambie St, Vancouver, BC','1100 3rd Ave, Prince George, BC', 785, 650, 800, 1300],
    ['7700 Edmonds St, Burnaby, BC','1350 Omineca Ave, Prince Rupert, BC', 1490, 1050, 1200, 2000],
    ['950 West Broadway, Vancouver, BC','1600 3rd Ave, Prince George, BC', 790, 660, 800, 1350],
    ['6551 No. 3 Rd, Richmond, BC','200 Reid St, Quesnel, BC', 620, 520, 680, 1100],
    ['2695 Granville St, Vancouver, BC','500 Victoria St, Nelson, BC', 660, 560, 720, 1150],
];

const windows = ['9:00 AM - 12:00 PM','12:00 PM - 3:00 PM','3:00 PM - 6:00 PM','6:00 PM - 9:00 PM'];
const specialInstructions = [
    null, null, null, null, null, // many with no instructions
    'Brand new vehicle — handle with extra care',
    'Customer will meet at destination',
    'Customer prefers text updates on arrival',
    'Underground parking — check clearance',
    'Ferry crossing required — Tsawwassen to Swartz Bay',
    'Flatbed required for this vehicle',
    'EV — deliver with at least 50% charge',
    'Keys in lockbox at front desk',
    'Call customer 30 min before arrival',
    'Do not drive over 100km/h — break-in period',
    'Has aftermarket exhaust — sounds louder than normal',
    'Dash cam recording — please drive carefully',
    'Winter tires mandatory for this route',
    'Customer paying ferry fee separately',
    'Dealer plates attached — return after delivery',
    'Second key in glove compartment',
    null, null, null, null,
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function seed() {
    try {
        // Create tables
        await sql`CREATE TABLE IF NOT EXISTS delivery_jobs (
            id SERIAL PRIMARY KEY, customer_name TEXT NOT NULL, pickup_address TEXT NOT NULL,
            delivery_address TEXT NOT NULL, vehicle_info TEXT NOT NULL, distance REAL,
            estimated_time INTEGER, delivery_date DATE NOT NULL, delivery_window TEXT NOT NULL,
            special_instructions TEXT, status TEXT DEFAULT 'open', winning_bid_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        await sql`CREATE TABLE IF NOT EXISTS drivers (
            id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL, license_number TEXT UNIQUE NOT NULL, vehicle_type TEXT NOT NULL,
            rating REAL DEFAULT 5.0, completed_deliveries INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        await sql`CREATE TABLE IF NOT EXISTS driver_bids (
            id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL, driver_id INTEGER NOT NULL,
            bid_amount REAL NOT NULL, estimated_completion_time INTEGER NOT NULL,
            message TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

        // Clear
        await sql`DELETE FROM driver_bids`;
        await sql`DELETE FROM delivery_jobs`;
        await sql`DELETE FROM drivers`;
        console.log('Cleared existing data...');

        // Insert 12 drivers
        const driverData = [
            ['Marcus Thompson', 'marcus@driver.com', '604-555-0201', 'DL-901234', 'Flatbed Truck', 4.9, 412],
            ['Sarah Nguyen', 'sarah.n@driver.com', '778-555-0302', 'DL-567890', 'Enclosed Trailer', 4.8, 387],
            ['Jake Williams', 'jake.w@driver.com', '250-555-0403', 'DL-345612', 'Tow Truck', 4.7, 298],
            ['Priya Sharma', 'priya@driver.com', '604-555-0504', 'DL-678901', 'Flatbed Truck', 5.0, 465],
            ['Tyler Olsen', 'tyler@driver.com', '778-555-0605', 'DL-112233', 'Car Carrier', 4.6, 215],
            ['Lisa Park', 'lisa.p@driver.com', '250-555-0706', 'DL-445566', 'Enclosed Trailer', 4.9, 510],
            ['Derek Malone', 'derek.m@driver.com', '604-555-0807', 'DL-778899', 'Flatbed Truck', 4.8, 342],
            ['Anika Patel', 'anika@driver.com', '778-555-0908', 'DL-334455', 'Enclosed Trailer', 4.7, 278],
            ['Chris Belanger', 'chris.b@driver.com', '250-555-1009', 'DL-556677', 'Tow Truck', 4.9, 396],
            ['Rosa Fernandez', 'rosa@driver.com', '604-555-1110', 'DL-889900', 'Car Carrier', 4.8, 331],
            ['Nathan Blackwood', 'nathan.b@driver.com', '778-555-1211', 'DL-112244', 'Flatbed Truck', 4.6, 189],
            ['Emma Tremblay', 'emma.t@driver.com', '250-555-1312', 'DL-335577', 'Enclosed Trailer', 5.0, 445],
        ];
        const driverIds = [];
        for (const d of driverData) {
            const r = await sql`INSERT INTO drivers (name,email,phone,license_number,vehicle_type,rating,completed_deliveries) VALUES (${d[0]},${d[1]},${d[2]},${d[3]},${d[4]},${d[5]},${d[6]}) RETURNING id`;
            driverIds.push(r.rows[0].id);
        }
        console.log(`Inserted ${driverIds.length} drivers`);

        // ─── Generate ~200 completed deliveries totaling ~$600k ───
        let totalPaid = 0;
        let completedCount = 0;
        const usedVehicles = new Set();

        // Generate delivery dates spanning 2024-2026
        function randomDate() {
            const start = new Date('2024-03-01');
            const end = new Date('2026-02-14');
            const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
            return d.toISOString().split('T')[0];
        }

        // Keep generating until we hit ~$600k
        const targetTotal = 600000;
        const completedJobIds = [];

        while (totalPaid < targetTotal) {
            const route = pick(bcRoutes);
            const payAmount = rand(route[4], route[5]);

            // Pick a unique-ish vehicle
            let vehicle = pick(vehicles);

            const customer = `${pick(firstNames)} ${pick(lastNames)}`;
            const date = randomDate();
            const window = pick(windows);
            const instructions = pick(specialInstructions);

            const r = await sql`INSERT INTO delivery_jobs
                (customer_name, pickup_address, delivery_address, vehicle_info, distance, estimated_time, delivery_date, delivery_window, special_instructions, status)
                VALUES (${customer}, ${route[0]}, ${route[1]}, ${vehicle}, ${route[2]}, ${route[3]}, ${date}, ${window}, ${instructions}, 'completed')
                RETURNING id`;

            const jobId = r.rows[0].id;
            completedJobIds.push(jobId);

            // Create winning bid
            const driverId = pick(driverIds);
            const bidR = await sql`INSERT INTO driver_bids
                (job_id, driver_id, bid_amount, estimated_completion_time, message, status)
                VALUES (${jobId}, ${driverId}, ${payAmount}, ${route[3]}, 'Available for this delivery.', 'accepted')
                RETURNING id`;

            await sql`UPDATE delivery_jobs SET winning_bid_id = ${bidR.rows[0].id} WHERE id = ${jobId}`;

            totalPaid += payAmount;
            completedCount++;

            if (completedCount % 50 === 0) {
                console.log(`  ... ${completedCount} completed jobs, $${totalPaid.toLocaleString()} total`);
            }
        }
        console.log(`Inserted ${completedCount} completed jobs — Total: $${totalPaid.toLocaleString()}`);

        // ─── 8 Open jobs for drivers to bid on ───
        const openJobs = [
            ['Steven Clark', '4700 Kingsway, Burnaby, BC', '1433 Fairfield Rd, Victoria, BC', '2025 Honda CR-V Hybrid - Urban Gray', 95, 150, '2026-02-18', '9:00 AM - 12:00 PM', 'Ferry crossing required — customer paying ferry fee'],
            ['Nina Petrov', '2150 Western Pkwy, UBC, Vancouver, BC', '32555 London Ave, Mission, BC', '2024 Mazda CX-50 Turbo - Zircon Sand', 78, 90, '2026-02-19', '12:00 PM - 3:00 PM', null],
            ['Ahmad Hassan', '10153 King George Blvd, Surrey, BC', '3550 Lougheed Hwy, Coquitlam, BC', '2023 Kia EV6 GT-Line - Yacht Blue', 31, 45, '2026-02-20', '3:00 PM - 6:00 PM', 'EV — must have 50% charge on arrival'],
            ['Rebecca Fontaine', '290 City Centre, Kitimat, BC', '4612 Park Ave, Terrace, BC', '2024 Subaru Outback Wilderness - Autumn Green', 61, 75, '2026-02-21', '9:00 AM - 12:00 PM', 'Northern route — winter tires required'],
            ['Tony Marchetti', '1055 Dunsmuir St, Vancouver, BC', '45600 Airport Rd, Chilliwack, BC', '2025 Toyota RAV4 Prime SE - Blueprint', 102, 120, '2026-02-22', '9:00 AM - 12:00 PM', 'Hybrid — deliver fully charged'],
            ['Samantha Wells', '3025 Lougheed Hwy, Coquitlam, BC', '710 Redbrick Ave, Kamloops, BC', '2024 Ford Bronco Sport Big Bend - Cactus Gray', 355, 300, '2026-02-23', '6:00 PM - 9:00 PM', 'Long haul — Coquihalla Hwy. Winter tires mandatory'],
            ['Michael Zhao', '7899 Templeton Station Rd, Richmond, BC', '1801 Lonsdale Ave, North Vancouver, BC', '2023 Lexus RX 350h - Eminent White', 22, 35, '2026-02-24', '12:00 PM - 3:00 PM', null],
            ['Linda O\'Brien', '2525 Commercial Dr, Vancouver, BC', '4850 Marine Dr, Burnaby, BC', '2024 Volkswagen ID.4 Pro S - Moonstone Grey', 11, 20, '2026-02-25', '3:00 PM - 6:00 PM', 'EV — charger adapter in glove box'],
        ];

        const openJobIds = [];
        for (const j of openJobs) {
            const r = await sql`INSERT INTO delivery_jobs (customer_name,pickup_address,delivery_address,vehicle_info,distance,estimated_time,delivery_date,delivery_window,special_instructions,status) VALUES (${j[0]},${j[1]},${j[2]},${j[3]},${j[4]},${j[5]},${j[6]},${j[7]},${j[8]},'open') RETURNING id`;
            openJobIds.push(r.rows[0].id);
        }
        console.log('Inserted 8 open jobs');

        // Add some bids on open jobs
        const pendingBids = [
            [openJobIds[0], driverIds[1], 240, 140, 'Ferry run — I can do this efficiently.'],
            [openJobIds[0], driverIds[0], 260, 150, null],
            [openJobIds[1], driverIds[2], 150, 85, 'Know the Mission area well.'],
            [openJobIds[2], driverIds[4], 80, 40, 'Quick local delivery.'],
            [openJobIds[4], driverIds[3], 220, 110, 'Done this route before.'],
            [openJobIds[5], driverIds[1], 550, 280, 'Long haul specialist — Coquihalla veteran.'],
            [openJobIds[5], driverIds[8], 520, 290, 'Experienced with this route.'],
            [openJobIds[6], driverIds[6], 60, 30, 'Quick bridge run.'],
        ];
        for (const b of pendingBids) {
            await sql`INSERT INTO driver_bids (job_id,driver_id,bid_amount,estimated_completion_time,message,status) VALUES (${b[0]},${b[1]},${b[2]},${b[3]},${b[4]},'pending')`;
        }
        console.log('Inserted pending bids on open jobs');

        console.log('');
        console.log('=== SEED COMPLETE ===');
        console.log(`  ${completedCount} completed deliveries`);
        console.log(`  $${totalPaid.toLocaleString()} total paid to drivers`);
        console.log(`  8 open jobs for bidding`);
        console.log(`  12 active drivers`);

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seed();
