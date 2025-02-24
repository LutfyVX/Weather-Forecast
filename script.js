async function getWeather(city) {
    const wilayahMap = await readWilayahTXT();
    const kodeWilayah = wilayahMap[city];

    if (!kodeWilayah) {
        document.getElementById("weatherResult").innerHTML = `<p class="text-red-500">Kode wilayah tidak ditemukan!</p>`;
        return;
    }

    const apiUrl = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${kodeWilayah}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Gagal mengambil data dari API BMKG");

        const data = await response.json();
        console.log("Data JSON API BMKG:", data); // Cek struktur di Console

        const prakiraan = data?.data?.[0]; // Ambil elemen pertama dari array "data"
        if (!prakiraan) {
            throw new Error("Data prakiraan cuaca tidak ditemukan");
        }

        // Gabungkan semua kondisi cuaca
        const cuacaList = prakiraan?.cuaca?.map(item => `${item.jam}: ${item.kondisi}`).join("<br>") || "Tidak tersedia";
        const suhuMin = prakiraan?.suhu_min || "Tidak tersedia";
        const suhuMax = prakiraan?.suhu_max || "Tidak tersedia";

        document.getElementById("weatherResult").innerHTML = `
            <p class="text-lg font-semibold">Cuaca:</p>
            <p class="text-sm">${cuacaList}</p>
            <p class="text-lg mt-2">Suhu: ${suhuMin}°C - ${suhuMax}°C</p>
        `;

    } catch (error) {
        console.error("Error:", error);
        document.getElementById("weatherResult").innerHTML = `<p class="text-red-500">Gagal mengambil data cuaca.</p>`;
    }
}
