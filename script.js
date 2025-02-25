document.getElementById("btnGetWeather").addEventListener("click", async () => {
    const city = document.getElementById("inputCity").value.trim();
    if (!city) {
        alert("Masukkan nama kota!");
        return;
    }

    await getWeatherByCity(city);
});

let map; // Variabel global untuk menyimpan peta
let tempChart; // Variabel global untuk chart

document.addEventListener("DOMContentLoaded", () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            // Ambil data cuaca berdasarkan koordinat
            await getWeatherByCoordinates(lat, lon);
        }, (error) => {
            console.error("Gagal mendapatkan lokasi:", error);
            document.getElementById("weatherInfo").innerHTML = `<p class="text-red-500">Gagal mendapatkan lokasi.</p>`;
        });
    } else {
        alert("Geolocation tidak didukung di browser ini.");
    }
});

// Fungsi mendapatkan cuaca berdasarkan koordinat
async function getWeatherByCoordinates(lat, lon) {
    const apiKey = "df01bb552ae04b1f2944902ebaead8d2";
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    await fetchWeather(apiUrl, forecastUrl, airQualityUrl);
}

// Fungsi mendapatkan cuaca berdasarkan nama kota
async function getWeatherByCity(city) {
    const apiKey = "df01bb552ae04b1f2944902ebaead8d2";
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Gagal mengambil data cuaca!");
        
        const data = await response.json();
        const lat = data.coord.lat;
        const lon = data.coord.lon;
        
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        
        await fetchWeather(apiUrl, forecastUrl, airQualityUrl);
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("weatherInfo").innerHTML = `<p class="text-red-500">Gagal mengambil data cuaca.</p>`;
    }
}

// Fungsi untuk fetch data cuaca
async function fetchWeather(apiUrl, forecastUrl, airQualityUrl) {
    try {
        // Fetch current weather
        const weatherResponse = await fetch(apiUrl);
        if (!weatherResponse.ok) throw new Error("Gagal mengambil data cuaca!");
        const weatherData = await weatherResponse.json();

        // Fetch forecast
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error("Gagal mengambil data prakiraan!");
        const forecastData = await forecastResponse.json();

        // Fetch air quality
        const airQualityResponse = await fetch(airQualityUrl);
        if (!airQualityResponse.ok) throw new Error("Gagal mengambil data kualitas udara!");
        const airQualityData = await airQualityResponse.json();

        const temperature = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const windSpeed = weatherData.wind.speed;
        const weatherCondition = weatherData.weather[0].main;
        const city = weatherData.name;
        const timezoneOffset = weatherData.timezone; // Offset dalam detik
        const aqi = airQualityData.list[0].main.aqi; // AQI index (1-5)

        // Hitung waktu lokal berdasarkan zona waktu kota
        const localTime = getLocalTime(timezoneOffset);

        // Perbarui elemen HTML untuk cuaca saat ini
        document.getElementById("weatherInfo").innerHTML = `
            <p class="text-lg font-bold">${city}, ${weatherData.sys.country}</p>
            <p class="text-lg text-center"> ${localTime}</p>
            <img src="${getWeatherIcon(weatherCondition)}" alt="${weatherCondition}" class="w-20 mx-auto">
            <p class="text-xl text-center">${weatherCondition}</p>
        `;

        // Update metric boxes
        document.getElementById("temperature").innerText = `${temperature.toFixed(1)}°C`;
        document.getElementById("humidity").innerText = `${humidity}%`;
        document.getElementById("windSpeed").innerText = `${(windSpeed * 3.6).toFixed(1)} km/h`; // Convert m/s to km/h
        document.getElementById("airQuality").innerText = getAirQualityText(aqi);

        // Perbarui peta
        updateMap(weatherData.coord.lat, weatherData.coord.lon, city, temperature, weatherCondition);
        
        // Update hourly forecast
        updateHourlyForecast(forecastData.list, timezoneOffset);
        
        // Update 5-day forecast
        updateFiveDayForecast(forecastData.list, timezoneOffset);
        
        // Update temperature chart
        updateTempChart(forecastData.list, timezoneOffset);
        
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("weatherInfo").innerHTML = `<p class="text-red-500">Gagal mengambil data cuaca.</p>`;
    }
}

// Fungsi untuk mendapatkan ikon cuaca
function getWeatherIcon(condition) {
    const weatherIcons = {
        Clear: "./animated/clear-day.svg",
        Clouds: "./animated/cloudy.svg",
        Rain: "./animated/rainy-2.svg",
        Thunderstorm: "./animated/scattered.svg",
        Drizzle: "./animated/drizzle.svg",
        Snow: "./animated/snow.svg",
        Mist: "./animated/mist.svg",
        Fog: "./animated/fog.svg"
    };

    return weatherIcons[condition] || "./animated/unknown.svg";
}

// Fungsi untuk memperbarui peta
function updateMap(lat, lon, city, temperature, condition) {
    if (!map) {
        map = L.map("map").setView([lat, lon], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    } else {
        map.setView([lat, lon], 10);
    }

    // Hapus marker lama sebelum menambahkan yang baru
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<b>${city}</b><br>Suhu: ${temperature}°C<br>Cuaca: ${condition}`)
        .openPopup();
}

// Fungsi untuk mendapatkan waktu lokal berdasarkan timezone offset
function getLocalTime(timezoneOffset) {
    const utcTime = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (timezoneOffset * 1000));
    
    return localTime.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true // Mengaktifkan format AM/PM
    });
}

// Fungsi untuk mendapatkan teks kualitas udara berdasarkan indeks AQI
function getAirQualityText(aqi) {
    const aqiTexts = {
        1: "Sangat Baik",
        2: "Baik",
        3: "Sedang",
        4: "Buruk",
        5: "Sangat Buruk"
    };
    
    return aqiTexts[aqi] || "Tidak diketahui";
}

// Fungsi untuk memperbarui prakiraan per jam
function updateHourlyForecast(forecastList, timezoneOffset) {
    const forecastContainer = document.getElementById("weatherForecast");
    forecastContainer.innerHTML = "";
    
    // Hanya ambil 4 entri pertama (12 jam ke depan)
    const hourlyData = forecastList.slice(0, 4);
    
    hourlyData.forEach(item => {
        const dt = new Date((item.dt + timezoneOffset) * 1000);
        const temp = item.main.temp;
        const condition = item.weather[0].main;
        const hour = dt.getUTCHours();
        
        const forecastItem = document.createElement("div");
        forecastItem.className = "bg-gray-100 p-3 rounded-lg text-center";
        forecastItem.innerHTML = `
            <p class="font-bold">${formatHour(hour)}</p>
            <img src="${getWeatherIcon(condition)}" alt="${condition}" class="w-10 h-10 mx-auto my-2">
            <p>${temp.toFixed(1)}°C</p>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
}

// Fungsi untuk memperbarui prakiraan 5 hari
function updateFiveDayForecast(forecastList, timezoneOffset) {
    const forecastContainer = document.getElementById("fiveDayForecast");
    forecastContainer.innerHTML = "";
    
    // Kelompokkan data berdasarkan hari
    const dailyData = groupByDay(forecastList, timezoneOffset);
    
    // Tampilkan data untuk 5 hari
    Object.keys(dailyData).slice(0, 5).forEach(date => {
        const dayData = dailyData[date];
        
        // Ambil data rata-rata/maksimum/minimum untuk hari tersebut
        const avgTemp = calculateAverage(dayData.map(item => item.main.temp));
        const condition = getMostFrequentCondition(dayData);
        const minTemp = Math.min(...dayData.map(item => item.main.temp));
        const maxTemp = Math.max(...dayData.map(item => item.main.temp));
        const avgHumidity = calculateAverage(dayData.map(item => item.main.humidity));
        const avgWindSpeed = calculateAverage(dayData.map(item => item.wind.speed)) * 3.6; // Convert to km/h
        
        const [dayName, dayMonth] = formatDate(date);
        
        const forecastItem = document.createElement("div");
        forecastItem.className = "bg-gray-100 p-3 rounded-lg";
        forecastItem.innerHTML = `
            <div class="flex items-center justify-between">
                <p class="font-bold">${dayName}</p>
                <p>${dayMonth}</p>
            </div>
            <div class="flex items-center justify-between mt-2">
                <img src="${getWeatherIcon(condition)}" alt="${condition}" class="w-12 h-12">
                <div class="text-right">
                    <p class="font-bold">${avgTemp.toFixed(1)}°C</p>
                    <p class="text-sm text-gray-600">${minTemp.toFixed(1)}° / ${maxTemp.toFixed(1)}°</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div class="flex items-center">
                    <i class="fas fa-droplet text-blue-500 mr-2"></i>
                    <span>${avgHumidity.toFixed(0)}%</span>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-wind text-blue-500 mr-2"></i>
                    <span>${avgWindSpeed.toFixed(1)} km/h</span>
                </div>
            </div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
}

// Fungsi untuk memperbarui chart suhu
function updateTempChart(forecastList, timezoneOffset) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    
    // Ambil 8 data pertama untuk chart (24 jam ke depan)
    const chartData = forecastList.slice(0, 8);
    
    const labels = chartData.map(item => {
        const dt = new Date((item.dt + timezoneOffset) * 1000);
        return formatHour(dt.getUTCHours());
    });
    
    const temperatures = chartData.map(item => item.main.temp);
    
    // Hapus chart sebelumnya jika ada
    if (tempChart) {
        tempChart.destroy();
    }
    
    tempChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Suhu (°C)',
                data: temperatures,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(1)}°C`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Helper function untuk mengelompokkan data berdasarkan hari
function groupByDay(forecastList, timezoneOffset) {
    const groupedData = {};
    
    forecastList.forEach(item => {
        const dt = new Date((item.dt + timezoneOffset) * 1000);
        const date = dt.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!groupedData[date]) {
            groupedData[date] = [];
        }
        
        groupedData[date].push(item);
    });
    
    return groupedData;
}

// Helper function untuk menghitung rata-rata
function calculateAverage(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// Helper function untuk mendapatkan kondisi cuaca yang paling sering
function getMostFrequentCondition(dayData) {
    const conditionCounts = {};
    
    dayData.forEach(item => {
        const condition = item.weather[0].main;
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });
    
    return Object.keys(conditionCounts).reduce((a, b) => 
        conditionCounts[a] > conditionCounts[b] ? a : b
    );
}

// Helper function untuk format jam
function formatHour(hour) {
    return `${hour}:00`;
}

// Helper function untuk format tanggal
function formatDate(dateString) {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
    const dayMonth = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    
    return [dayName, dayMonth];
}