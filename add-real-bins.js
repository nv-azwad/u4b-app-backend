const pool = require('./config/database');

// Your real bin data
const realBins = [
  {
    qrCodeId: '20C74DAB',
    siteCode: 'CH1007M',
    locationName: 'Ardence Labs',
    address: 'Persiaran Setia Alam, Eco Ardence, Shah Alam',
    locationCode: 'L0839',
    binCount: 1,
    longitude: 101.48125,
    latitude: 3.095017
  },
  {
    qrCodeId: '99E493CB',
    siteCode: 'CH0986M',
    locationName: 'Jaya grocer Setia Alam',
    address: 'Setia Avenue, Setia Alam, 40170 Shah Alam',
    locationCode: 'L0764',
    binCount: 1,
    longitude: 101.48125,
    latitude: 3.095017
  },
  {
    qrCodeId: 'EFBC1333',
    siteCode: 'CH0987M',
    locationName: 'Eco World Development Sdn Bhd - Site 2',
    address: 'Setia Avenue, Setia Alam, 40170 Shah Alam',
    locationCode: 'L0765',
    binCount: 1,
    longitude: 101.446299,
    latitude: 3.106348
  },
  {
    qrCodeId: '6D5A5652',
    siteCode: 'FR1686M',
    locationName: 'Masjid Kiayi Haji Abdullah Umar',
    address: 'Lot 3911, Kg. Bt 4 1/2, jln Kapar, 42100 Klang',
    locationCode: 'L1975, L1983',
    binCount: 2,
    longitude: 101.405622,
    latitude: 3.079649
  },
  {
    qrCodeId: '72088E93',
    siteCode: 'VI1147M',
    locationName: 'Shell Petrol Station Kg Batu Belah',
    address: 'Lot5293-5290, Kg Batu Belah, Jalan Sungai Putus, 42100, Klang, Selangor',
    locationCode: 'L1894, L1895',
    binCount: 2,
    longitude: 101.438111,
    latitude: 3.070622
  },
  {
    qrCodeId: 'C72AF4F5',
    siteCode: 'FR0881M',
    locationName: 'Masjid As- Syarif Meru',
    address: 'Persiaran Hamzah Alang, 42200 Kapar Selangor',
    locationCode: 'L0687',
    binCount: 1,
    longitude: 101.409328,
    latitude: 3.139186
  },
  {
    qrCodeId: '523F453D',
    siteCode: 'FR0048M',
    locationName: 'Taman Meru Impian',
    address: '23, Jalan Kopi 16 / KU 10, jln Rambutan, Taman Meru Impian, 42200 Kapar, Selangor',
    locationCode: '',
    binCount: 0,
    longitude: 101.409328,
    latitude: 3.139186
  },
  {
    qrCodeId: '960A31A2',
    siteCode: 'FR0049M',
    locationName: 'Taman Seri Meru',
    address: 'Jalan Seri Kenangan 1, 41050',
    locationCode: 'L2366',
    binCount: 1,
    longitude: 101.444244,
    latitude: 3.135884
  },
  {
    qrCodeId: '36A930FF',
    siteCode: 'FR0192M',
    locationName: 'Kampung Batu Empat',
    address: 'Jalan Wan Hassan 42000 Klang, Selangor',
    locationCode: 'L2386',
    binCount: 1,
    longitude: 101.401038,
    latitude: 3.07886
  },
  {
    qrCodeId: '4D1381DC',
    siteCode: 'FR0193M',
    locationName: 'Taman Sungai Japar Indah',
    address: 'Jalan Sungai Kapar Indah 10, 42200 Kapar, Selangor',
    locationCode: 'L2388',
    binCount: 1,
    longitude: 101.380394,
    latitude: 3.100667
  },
  {
    qrCodeId: '74059FD9',
    siteCode: 'TT0034',
    locationName: 'Lotus Jenjarom',
    address: 'Tesco Jenjarum, Banting Selangor',
    locationCode: 'L1749, L2422, L1750',
    binCount: 3,
    longitude: 101.502304,
    latitude: 2.874473
  },
  {
    qrCodeId: '0EA6C851',
    siteCode: 'FR2972M',
    locationName: 'Taman Dato Hormat',
    address: 'Jalan Palas 10, Taman Dato Hormat, 42500 Telok Panglima Garang, Selangor',
    locationCode: 'L1855',
    binCount: 1,
    longitude: 101.462200,
    latitude: 2.908600
  },
  {
    qrCodeId: 'B2A15B0A',
    siteCode: 'FR2973M',
    locationName: 'Jalan Mengkuang 4',
    address: 'Taman Dato Hormat, 42500 Telok Panglima Garang Selangor',
    locationCode: 'L1857',
    binCount: 1,
    longitude: 101.464700,
    latitude: 2.905700
  },
  {
    qrCodeId: '195E1BB0',
    siteCode: 'FR2178M',
    locationName: 'Kampung Kuantan',
    address: 'Kampung Kuantan, 45000, Kuala Selangor, Selangor',
    locationCode: 'L1561',
    binCount: 1,
    longitude: 101.301420,
    latitude: 3.360501
  },
  {
    qrCodeId: '642088A2',
    siteCode: 'FR2179M',
    locationName: 'Jalan Majlis Bandar Melawati',
    address: 'Jalan Majlis, Bandar Melawati, 45000, Kuala Selangor, Selangor',
    locationCode: 'L2100',
    binCount: 1,
    longitude: 101.250140,
    latitude: 3.333520
  },
  {
    qrCodeId: '0F7C4171',
    siteCode: 'FR2180M',
    locationName: 'Jalan Cengal',
    address: '19, Jalan Cengal 2/1, Taman Malawati Jaya, 45000 Kuala Selangor, Selangor',
    locationCode: 'L2070',
    binCount: 1,
    longitude: 101.269600,
    latitude: 3.312030
  },
  {
    qrCodeId: '3A3EE6C7',
    siteCode: 'FR2181M',
    locationName: 'Jalan Kemajuan',
    address: 'Jalan Kemajuan, Kuala Selangor, Selangor',
    locationCode: 'L1536',
    binCount: 1,
    longitude: 101.251070,
    latitude: 3.325910
  },
  {
    qrCodeId: 'F110D60B',
    siteCode: 'FR1527M',
    locationName: 'Road side',
    address: 'Jalan Melati 3/2, Bandar Melawati, 45000, Kuala Selangor, Selangor',
    locationCode: 'L1168',
    binCount: 1,
    longitude: 101.255349,
    latitude: 3.329414
  },
  {
    qrCodeId: '75764063',
    siteCode: 'FR1547M',
    locationName: 'Dewan Orang Ramai Kg Sg Serdang',
    address: 'Kampung Tok Muda, Kapar, Selangor',
    locationCode: 'L1162',
    binCount: 1,
    longitude: 101.328633,
    latitude: 3.322367
  },
  {
    qrCodeId: '3DDAE1C0',
    siteCode: 'FR1687M',
    locationName: 'Road side',
    address: '16, Jalan Pendidikan, Bandar Baru, 45000 Kuala Selangor, Selangor',
    locationCode: 'L2310',
    binCount: 1,
    longitude: 101.259400,
    latitude: 3.322367
  },
  {
    qrCodeId: 'CB198EA7',
    siteCode: 'FR1688M',
    locationName: 'Road side',
    address: 'Jalan 2/3, Bandar Baru, 45000 Kuala Selangor',
    locationCode: 'L1204',
    binCount: 1,
    longitude: 101.259107,
    latitude: 3.326455
  },
  {
    qrCodeId: '8CF63861',
    siteCode: 'FR1689M',
    locationName: 'Road side',
    address: 'Jalan Perbandaran, Bandar Melawati, 45000 Kuala Selangor',
    locationCode: 'L1203',
    binCount: 1,
    longitude: 101.256611,
    latitude: 3.328090
  },
  {
    qrCodeId: '64BDDF19',
    siteCode: 'FR0568M',
    locationName: 'Majlis Daerah Kuala Selangor',
    address: 'Jalan 2/2, Kuala Selangor',
    locationCode: 'L2088',
    binCount: 1,
    longitude: 101.258682,
    latitude: 3.328182
  },
  {
    qrCodeId: 'D7613A47',
    siteCode: 'TT0030',
    locationName: 'Lotus Kuala Selangor',
    address: 'Tesco Kuala Selangor',
    locationCode: '1006',
    binCount: 1,
    longitude: 101.271150,
    latitude: 3.318963
  },
  {
    qrCodeId: '661ACCDF',
    siteCode: 'FR1511M',
    locationName: 'Road side',
    address: 'Jalan Perusahaan 2b, Taman IKS, Kuala Selangor, Selangor',
    locationCode: '1190',
    binCount: 1,
    longitude: 101.263337,
    latitude: 3.319623
  },
  {
    qrCodeId: '0D39A8F3',
    siteCode: 'FR1524M',
    locationName: 'Road side',
    address: 'Jalan Pendidikan, Bandar Melawati, Kuala Selangor',
    locationCode: '1153',
    binCount: 1,
    longitude: 101.25281,
    latitude: 3.32920
  },
  {
    qrCodeId: '76C25B12',
    siteCode: 'FR0564M',
    locationName: 'Majlis Daerah Kuala Selangor',
    address: 'Jalan Warisan 3, Kuala Selangor',
    locationCode: 'L1557',
    binCount: 1,
    longitude: 101.258401,
    latitude: 3.330685
  },
  {
    qrCodeId: 'A0468019',
    siteCode: 'FR3027M',
    locationName: 'Jalan Merbok',
    address: 'Kampung Bukit Kuching, Jeram, Selangor',
    locationCode: 'L1871',
    binCount: 1,
    longitude: 101.334000,
    latitude: 3.271300
  },
  {
    qrCodeId: 'A2B94C89',
    siteCode: 'FR3028M',
    locationName: 'Depan Surau - Jalan Merbau',
    address: '45800 Jeram, Selangor',
    locationCode: 'L1872',
    binCount: 1,
    longitude: 101.358000,
    latitude: 3.272400
  },
  {
    qrCodeId: 'ED500E4D',
    siteCode: 'FR3029M',
    locationName: 'Roadside',
    address: 'Kampung Parit Mahang, 45800 Jeram, Selangor',
    locationCode: 'L1954',
    binCount: 1,
    longitude: 101.374600,
    latitude: 3.279800
  },
  {
    qrCodeId: 'E3F64726',
    siteCode: 'FR3030M',
    locationName: 'Masjid Nurul Iman',
    address: 'Laluan 54, Kampung Ijok, 45700 Batang Berjuntai, Selangor',
    locationCode: 'L1973',
    binCount: 1,
    longitude: 101.401700,
    latitude: 3.312600
  },
  {
    qrCodeId: 'E826B838',
    siteCode: 'FR0880M',
    locationName: 'Masjid Al-Barokah',
    address: 'Kampung Assam Jawa, 45700 Kuala Selangor',
    locationCode: 'L0654',
    binCount: 1,
    longitude: 101.290078,
    latitude: 3.297800
  },
  {
    qrCodeId: '905F575E',
    siteCode: 'FR0876M',
    locationName: 'Masjid Jamiur Ridhuan',
    address: 'Jalan Kapar, 46500 Jeram',
    locationCode: 'L0640',
    binCount: 1,
    longitude: 101.314379,
    latitude: 3.223968
  },
  {
    qrCodeId: 'E74C222F',
    siteCode: 'FR1575M',
    locationName: 'Road side nearby car park',
    address: 'Taman Budi, Jeram, Selangor',
    locationCode: 'L1158',
    binCount: 1,
    longitude: 101.314379,
    latitude: 3.225257
  },
  {
    qrCodeId: '5142AB3D',
    siteCode: 'TT0028',
    locationName: 'Lotus Puncak Alam',
    address: 'Tesco Puncak Alam',
    locationCode: '1131',
    binCount: 1,
    longitude: 101.427535,
    latitude: 3.235947
  },
  {
    qrCodeId: '9B39B0FF',
    siteCode: 'FR2963M',
    locationName: 'Lorong Naluri Sukma 8/1',
    address: 'Bandar Puncak Alam, Kuala Selangor',
    locationCode: 'L1854',
    binCount: 1,
    longitude: 101.425641,
    latitude: 3.227031
  },
  {
    qrCodeId: 'DBC093DC',
    siteCode: 'FR2965M',
    locationName: 'Jalan Alam Suria',
    address: '32, Jln Alam Suria 15/3/3, Bandar Puncak Alam, 42300 Bandar Puncak Alam, Selangor',
    locationCode: 'L1852',
    binCount: 1,
    longitude: 101.415800,
    latitude: 3.235500
  },
  {
    qrCodeId: '0D7A9349',
    siteCode: 'FR2966M',
    locationName: 'Lorong Az-Zaharah',
    address: 'Bandar Puncak Alam, 54010 Kuala Selangor',
    locationCode: 'L1853',
    binCount: 1,
    longitude: 101.419188,
    latitude: 3.229076
  },
  {
    qrCodeId: '5A6A27EF',
    siteCode: 'FR0917M',
    locationName: 'Road Side',
    address: 'Jalan Samudera 9/1, Bandar Puncak Alam, 45010 Kuala Selangor, Selangor',
    locationCode: '1008',
    binCount: 1,
    longitude: 101.424417,
    latitude: 3.232600
  },
  {
    qrCodeId: '547ECDD8',
    siteCode: 'FR0922M',
    locationName: 'Bus Stop',
    address: 'Jalan Mahkota Impian 2/2, Bandar Puncak Alam',
    locationCode: 'H030',
    binCount: 1,
    longitude: 101.435990,
    latitude: 3.218112
  },
  {
    qrCodeId: 'E8B913F2',
    siteCode: 'E8B913F2',
    locationName: 'UiTM Cawangan Selangor, Kampus Puncak Alam',
    address: 'UiTM Cawangan Selangor Kampus Puncak Alam Bandar Puncak Alam. 42300 Puncak Alam',
    locationCode: '',
    binCount: 1,
    longitude: 101.427535,
    latitude: 3.235947
  },
  {
    qrCodeId: '8D6FF806',
    siteCode: 'FR3486M',
    locationName: 'Taman Malawati Jaya',
    address: '1, Jalan Meranti 2, Taman Malawati Jaya, 45000 Kuala Selangor, Selangor',
    locationCode: 'L2409',
    binCount: 1,
    longitude: 101.272424,
    latitude: 3.312920
  },
  {
    qrCodeId: '0E3A7062',
    siteCode: 'FR3487M',
    locationName: 'Taman Bayu Alam',
    address: 'Jalan Alam 2, Taman Bayu Alam, 45000 Kuala Selangor, Selangor',
    locationCode: 'L2408',
    binCount: 1,
    longitude: 101.255700,
    latitude: 3.321417
  },
  {
    qrCodeId: 'ACA7A129',
    siteCode: 'FR3488M',
    locationName: 'Taman Malawati',
    address: '777, Jalan Klinik, Taman Malawati, 45000 Kuala Selangor, Selangor',
    locationCode: 'L2410',
    binCount: 1,
    longitude: 101.249888,
    latitude: 3.337330
  },
  {
    qrCodeId: '4A8FB381',
    siteCode: 'FR3489M',
    locationName: 'Taman Kuala Selangor Utama',
    address: 'Jalan KSU 3/1, Taman Kuala Selangor Utama, 45000 Kuala Selangor, Selangor',
    locationCode: 'L2404',
    binCount: 1,
    longitude: 101.269379,
    latitude: 3.335380
  },
  {
    qrCodeId: '0AF290CE',
    siteCode: 'FR3490M',
    locationName: 'Taman Kuala Selangor Utama',
    address: 'Jalan KSU 2/1, Taman Kuala Selangor Utama, 45000 Kuala Selangor, Selangor',
    locationCode: 'L2403',
    binCount: 1,
    longitude: 101.272017,
    latitude: 3.335033
  },
  {
    qrCodeId: '4A060DA9',
    siteCode: 'FR3491M',
    locationName: 'Pasir Penambang',
    address: 'Petronas, Pasir Penambang, 45000 Kuala Selangor, Selangor',
    locationCode: 'L2402',
    binCount: 1,
    longitude: 101.254813,
    latitude: 3.349186
  },
  {
    qrCodeId: 'F0CB56A3',
    siteCode: 'FR3492M',
    locationName: 'Taman Kuala Selangor Jaya',
    address: 'Jalan Ksj 6, Taman Kuala Selangor Jaya, 45000 Kuala Selangor',
    locationCode: 'L2401',
    binCount: 1,
    longitude: 101.266694,
    latitude: 3.330002
  },
  {
    qrCodeId: '610C2E12',
    siteCode: 'FR2007M',
    locationName: 'Taman Permainan',
    address: 'Jalan Menanti, Sungai Tengi Kiri, Pekan Tanjong Karang, 45500 Tanjong Karang, Selangor',
    locationCode: 'L1434',
    binCount: 1,
    longitude: 101.173430,
    latitude: 3.426080
  }
];

async function addRealBins() {
  try {
    console.log('🔄 Adding real bin data to database...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const bin of realBins) {
      try {
        // Check if bin already exists
        const existing = await pool.query(
          'SELECT * FROM bins WHERE qr_code_id = $1 OR bin_code = $2',
          [bin.qrCodeId, bin.qrCodeId]
        );

        if (existing.rows.length > 0) {
          console.log(`⏭️  Skipping ${bin.qrCodeId} - ${bin.locationName} (already exists)`);
          skipCount++;
          continue;
        }

        // Insert new bin
        await pool.query(
          `INSERT INTO bins 
           (bin_code, qr_code_id, site_code, location_name, address, location_code, 
            latitude, longitude, bin_count, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            bin.qrCodeId,        // bin_code = QR code ID
            bin.qrCodeId,        // qr_code_id
            bin.siteCode,        // site_code
            bin.locationName,    // location_name
            bin.address,         // address
            bin.locationCode,    // location_code
            bin.latitude,        // latitude
            bin.longitude,       // longitude
            bin.binCount,        // bin_count
            'active'             // status
          ]
        );

        console.log(`✅ Added: ${bin.qrCodeId} - ${bin.locationName}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error adding ${bin.qrCodeId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully added: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total bins in file: ${realBins.length}`);

    // Show total bins in database
    const totalResult = await pool.query('SELECT COUNT(*) FROM bins');
    console.log(`\n🗄️  Total bins in database: ${totalResult.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

addRealBins();