/* =========================================================
           GLOBAL STATE
           ========================================================= */

        let currentBrandFilter = 'all';
        let currentCategoryFilter = 'all';
        let searchQuery = '';

        let activeModalProduct = null;
        let currentSortedProducts = [];

        let currentModalImages = [];
        let currentModalImageIndex = 0;

        function createAISessionId() {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return 'dts-' + window.crypto.randomUUID();
            }

            // Secure fallback for browsers that support Web Crypto but not randomUUID().
            if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
                const bytes = new Uint8Array(16);
                window.crypto.getRandomValues(bytes);
                return 'dts-' + Array.from(bytes, function(byte) {
                    return byte.toString(16).padStart(2, '0');
                }).join('');
            }

            // Last-resort compatibility fallback: a session identifier is not an
            // authentication secret, so older/restricted browsers must not stop
            // the entire site from initializing just because Web Crypto is absent.
            return 'dts-' + Date.now().toString(36) + '-' +
                Math.random().toString(36).slice(2) +
                Math.random().toString(36).slice(2);
        }

        let aiConversation = [];
        let aiSessionId = createAISessionId();

        /*
         * IMPORTANT:
         * The existing Prizor and HOC products remain part of
         * the products array below.
         *
         * New generic products use brand: "".
         * Their supplier attribution is handled separately.
         */

        /* =========================================================
           HELPER: ESCAPE HTML
           ========================================================= */

        /* =========================================================
           SINGLE PRODUCT CATALOGUE DATA — BRANDS PRESERVED
           ========================================================= */

        const products = [
            {
                id: 1,
                name: "Prizor 4K Starlight Bullet IP Camera",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-4K-BL80",
                price: "₹8,499",
                priceValue: 8499,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1zq4mcYDqMk1U00C8BQfOlSVlJyxcBWRHC_1ZsDaSKA&s=10",
                thumbnails: [
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1zq4mcYDqMk1U00C8BQfOlSVlJyxcBWRHC_1ZsDaSKA&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVSSBU6D4SDamBNVTiUSKr8ZRhR9H7TDIJOth4Hb2ifQ&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpMponb4TzSFR25RtimMlw7dhm2qZuhFIjBL0obS5B-A&s=10"
                ],
                description: "High-performance Prizor 8MP 4K Starlight IP Bullet Camera with true WDR and IR range up to 50 meters.",
                specs: { "Brand": "Prizor", "Resolution": "8 MP", "Lens": "3.6mm", "Protection": "IP67" }
            },
            {
                id: 2,
                name: "Prizor 2MP Full HD Indoor Dome Camera",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-2MP-DM20",
                price: "₹2,499",
                priceValue: 2499,
                stock: "In Stock",
                image: "https://prizor.in/wp-content/uploads/2025/09/PR-RT-PD24DCA-28-768x768.png",
                thumbnails: ["https://prizor.in/wp-content/uploads/2025/09/PR-RT-PD24DCA-28-768x768.png","https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9XacuczBsPKaGXZ9BUcVJcuLou9GopgtYzbCW394GOA&s=10","https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRC9LCmYVb5da26KWPVoFxckvIlzmi32PTvwgbz6wWuxw&s=10"],
                description: "Crystal clear Prizor 1080p indoor dome security camera with built-in mic.",
                specs: { "Brand": "Prizor", "Resolution": "2 MP Full HD", "Audio": "Built-in Mic" }
            },
            {
                id: 3,
                name: "Prizor 4MP PTZ WiFi Outdoor Rotating Camera",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-4MP-PTZ01",
                price: "₹4,999",
                priceValue: 4999,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXY6T8o1qkLV55aFpUIXqTXoTTshASrqE188nONldRNA&s=10",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXY6T8o1qkLV55aFpUIXqTXoTTshASrqE188nONldRNA&s=10","https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJw0yXbQzdT7toTsbLrN_DO6p4B8qjKC-56SrtgkHZzg&s=10"],
                description: "Advanced Prizor 4MP Pan-Tilt-Zoom (PTZ) camera with 360-degree rotation, motion tracking, and color night vision.",
                specs: { "Brand": "Prizor", "Resolution": "4 MP HD", "Rotation": "360° Pan / 90° Tilt", "Connectivity": "WiFi & LAN" }
            },
            {
                id: 4,
                name: "Prizor 16-Channel 4K AI Network Video Recorder (NVR)",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-NVR-16CH4K",
                price: "₹14,999",
                priceValue: 14999,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbLC6ZuizDXCvLspy3aOTH7Ba6-9aghB9K-iiWEeUCEg&s=10",
                thumbnails: [
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbLC6ZuizDXCvLspy3aOTH7Ba6-9aghB9K-iiWEeUCEg&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSal8H12yaClte9kQys-wrCPUxhD5afyQD0X9a2KAOkgA&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbLC6ZuizDXCvLspy3aOTH7Ba6-9aghB9K-iiWEeUCEg&s=10"
                ],
                description: "Enterprise Prizor 16-Channel 4K NVR with H.265+ video compression and AI playback support.",
                specs: { "Brand": "Prizor", "Channels": "16 CH IP Input", "Decoding": "4K Support" }
            },
            {
                id: 5,
                name: "Prizor 8-Channel 5-in-1 Digital Video Recorder (DVR)",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-DVR-8CH5IN1",
                price: "₹5,499",
                priceValue: 5499,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHTpeW-eGB1AfZwym_ZrOo-NqTWpq-lCydBwZhkliqOQ&s",
                thumbnails: [
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHTpeW-eGB1AfZwym_ZrOo-NqTWpq-lCydBwZhkliqOQ&s",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHTpeW-eGB1AfZwym_ZrOo-NqTWpq-lCydBwZhkliqOQ&s",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHTpeW-eGB1AfZwym_ZrOo-NqTWpq-lCydBwZhkliqOQ&s"
                ],
                description: "Versatile Prizor 8-Channel DVR supporting TVI, AHD, CVI, CVBS, and IP cameras.",
                specs: { "Brand": "Prizor", "Compatibility": "5-in-1 hybrid cameras" }
            },
            {
                id: 6,
                name: "Prizor 8-Port Gigabit PoE+ Switch",
                brand: "Prizor",
                category: "Networking",
                sku: "PRZ-SW-8GPOE",
                price: "₹4,299",
                priceValue: 4299,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIOF61smTbbKyRku55onbLNQkcdpBg8zHV1tlqh_q9TQ&s=10",
                thumbnails: [
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIOF61smTbbKyRku55onbLNQkcdpBg8zHV1tlqh_q9TQ&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIOF61smTbbKyRku55onbLNQkcdpBg8zHV1tlqh_q9TQ&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIOF61smTbbKyRku55onbLNQkcdpBg8zHV1tlqh_q9TQ&s=10"
                ],
                description: "High-speed Prizor 8-port Gigabit PoE+ switch with 250m long-distance mode.",
                specs: { "Brand": "Prizor", "Ports": "8 PoE + 2 Uplink", "Budget": "120W" }
            },
            {
                id: 7,
                name: "Prizor 4-Channel Compact Mini NVR",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-NVR-4CH",
                price: "₹3,499",
                priceValue: 3499,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfgzovq1RzDijrmkBBr2YPVXRF0seN24eFo-pi-hY2QQ&s=10",
                thumbnails: [
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfgzovq1RzDijrmkBBr2YPVXRF0seN24eFo-pi-hY2QQ&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRoAK49wU4-iFQC1GtvTkEEnVygZ6J0g_ph1WNIkiMEw&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfgzovq1RzDijrmkBBr2YPVXRF0seN24eFo-pi-hY2QQ&s=10"
                ],
                description: "Compact 4-channel Prizor NVR ideal for small office and residential security setups.",
                specs: { "Brand": "Prizor", "Channels": "4 CH IP", "Support": "1 SATA HDD up to 6TB" }
            },
            {
                id: 12,
                name: "Prizor 43-Inch Smart 4K UHD TV",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-TV-43UHD",
                price: "₹24,999",
                priceValue: 24999,
                stock: "In Stock",
                image: "https://m.media-amazon.com/images/I/6125OtEvLzL._SX425_.jpg",
                thumbnails: [
                    "https://m.media-amazon.com/images/I/6125OtEvLzL._SX425_.jpg",
                    "https://m.media-amazon.com/images/I/51JtkMAA+WL._SX425_.jpg",
                    "https://m.media-amazon.com/images/I/61DA+fjS9GL._SX425_.jpg"
                ],
                description: "Prizor 43-inch 4K Ultra HD Smart LED TV designed for commercial display and surveillance monitoring.",
                specs: { "Brand": "Prizor", "Resolution": "4K UHD", "Display": "Smart LED" }
            },
            {
                id: 13,
                name: "Prizor 55-Inch Frameless Smart LED TV",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-TV-55FL",
                price: "₹36,999",
                priceValue: 36999,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTZ_7pIU979ttzV3uDz3pS5F4N7Lh2dpF2G3FPb6Nz_A&s=10",
                thumbnails: [
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTZ_7pIU979ttzV3uDz3pS5F4N7Lh2dpF2G3FPb6Nz_A&s=10"
                ],
                description: "Prizor large-screen 55-inch frameless smart television with vivid color reproduction and built-in apps.",
                specs: { "Brand": "Prizor", "Size": "55 Inch", "Design": "Frameless" }
            },
            {
                id: 14,
                name: "Prizor Interactive Touch Panel 75-Inch",
                brand: "Prizor",
                category: "IT Infrastructure",
                sku: "PRZ-TP-75IN",
                price: "₹89,999",
                priceValue: 89999,
                stock: "Available on Order",
                image: "https://m.media-amazon.com/images/I/610abV1hm-L._SL1080_.jpg",
                thumbnails: [
                    "https://m.media-amazon.com/images/I/610abV1hm-L._SL1080_.jpg",
                    "https://m.media-amazon.com/images/I/61EAhVfxmsL._SL1081_.jpg",
                    "https://m.media-amazon.com/images/I/61ltVcGtwaL._SL1080_.jpg",
                    "https://m.media-amazon.com/images/I/61x23qxzYFL._SL1080_.jpg",
                    "https://m.media-amazon.com/images/I/616uUtHrqiL._SL1081_.jpg",
                    "https://m.media-amazon.com/images/I/61iFqcEcDcL._SL1080_.jpg"
                ],
                description: "Advanced Prizor 75-inch Interactive Touch Flat Panel for smart classrooms, conference rooms, and corporate presentations.",
                specs: { "Brand": "Prizor", "Display": "4K UHD Touch", "Touch Points": "20-Point Multi-Touch" }
            },
            {
                id: 15,
                name: "Prizor 4G Solar Powered PTZ Security Camera",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PRZ-SOLAR-4GPTZ",
                price: "₹11,999",
                priceValue: 11999,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFWUGcUr-cvkvEeRVMHMOjLdJWbbGhNV3q2hHki5X5oQ&s",
                thumbnails: [
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFWUGcUr-cvkvEeRVMHMOjLdJWbbGhNV3q2hHki5X5oQ&s",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFCo-FV6jwGDGxRyJ99MnKiYbjoYjCK5FZFd6qNb32Fw&s=10",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFWUGcUr-cvkvEeRVMHMOjLdJWbbGhNV3q2hHki5X5oQ&s"
                ],
                description: "Completely wireless Prizor 4G Solar PTZ camera with built-in battery and solar panel for remote locations without electricity.",
                specs: { "Brand": "Prizor", "Connectivity": "4G SIM Card", "Power": "Solar + Battery" }
            },
            {
                id: 16,
                name: "Prizor 7-Inch Color Video Door Phone (VDP)",
                brand: "Prizor",
                category: "Access Control",
                sku: "PRZ-VDP-7IN",
                price: "₹6,499",
                priceValue: 6499,
                stock: "In Stock",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmKClwyWSRwuXDxyqdBrhC6KGABQjLDN8MawDvTlN4bw&s=10",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmKClwyWSRwuXDxyqdBrhC6KGABQjLDN8MawDvTlN4bw&s=10"],
                description: "Secure your entrance with Prizor 7-inch indoor monitor and outdoor doorbell camera with night vision and intercom feature.",
                specs: { "Brand": "Prizor", "Display": "7 Inch Color TFT", "Features": "Two-way intercom" }
            },
            {
                id: 8,
                name: "HOC Heavy-Duty 3+1 CCTV Copper Cable (90 Meters)",
                brand: "HOC",
                category: "Networking",
                sku: "HOC-CBL-3P190",
                price: "₹2,199",
                priceValue: 2199,
                stock: "In Stock",
                image: "https://m.media-amazon.com/images/I/618txm2-2UL._AC_UY218_.jpg",
                thumbnails: [
                    "https://m.media-amazon.com/images/I/618txm2-2UL._AC_UY218_.jpg",
                    "https://m.media-amazon.com/images/I/71hI7eTHtVL._SY445_.jpg",
                    "https://m.media-amazon.com/images/I/718EuQmoD2L._SX425_.jpg"
                ],
                description: "Premium quality HOC 3+1 CCTV security camera cable bundle with pure copper conductors.",
                specs: { "Brand": "HOC", "Length": "90 Meters", "Conductor": "Pure Copper" }
            },
            {
                id: 9,
                name: "HOC CAT6 High-Speed Pure Copper Networking Cable (305m)",
                brand: "HOC",
                category: "Networking",
                sku: "HOC-CAT6-305M",
                price: "₹6,499",
                priceValue: 6499,
                stock: "In Stock",
                image: "https://m.media-amazon.com/images/I/71xulIrLFCL._SX425_.jpg",
                thumbnails: ["https://m.media-amazon.com/images/I/71xulIrLFCL._SX425_.jpg","https://m.media-amazon.com/images/I/61JPXGD0d1L._SX425_.jpg","https://m.media-amazon.com/images/I/71aJoHYlzUL._SL1500_.jpg","https://m.media-amazon.com/images/I/71k1wsRnK1L._SL1500_.jpg","https://m.media-amazon.com/images/I/719KgFJZAKL._SL1500_.jpg"],
                description: "Industrial-grade HOC CAT6 UTP networking cable engineered for Gigabit PoE setups.",
                specs: { "Brand": "HOC", "Length": "305 Meters Box", "Standard": "CAT6 UTP" }
            },
            {
                id: 10,
                name: "HOC Coaxial RG6 RG59 Dual Shield Cable (90m)",
                brand: "HOC",
                category: "Networking",
                sku: "HOC-RG6-90M",
                price: "₹1,899",
                priceValue: 1899,
                stock: "In Stock",
                image: "https://m.media-amazon.com/images/I/61Bc-iB6EWL._SX425_.jpg",
                thumbnails: [
                    "https://m.media-amazon.com/images/I/61Bc-iB6EWL._SX425_.jpg",
                    "https://m.media-amazon.com/images/I/61bQ648dQlL._SX425_.jpg",
                    "https://m.media-amazon.com/images/I/716+VxB6MSL._SX425_.jpg"
                ],
                description: "High shielding HOC RG6 coaxial cable designed for low-loss analog and HD camera signal transmissions.",
                specs: { "Brand": "HOC", "Length": "90 Meters", "Shielding": "Dual Shield Braided" }
            },
            {
                id: 17,
                name: "HOC CAT6 Outdoor Shielded Gel-Filled Cable (305m)",
                brand: "HOC",
                category: "Networking",
                sku: "HOC-CAT6-OUT305",
                price: "₹7,999",
                priceValue: 7999,
                stock: "In Stock",
                image: "https://m.media-amazon.com/images/I/81ms8EpWVBL._SX569_.jpg",
                thumbnails: ["https://m.media-amazon.com/images/I/81ms8EpWVBL._SX569_.jpg","https://m.media-amazon.com/images/I/715xKqXJvxL._SX569_.jpg","https://m.media-amazon.com/images/I/71237SX2hqL._SX569_.jpg"],
                description: "Weatherproof HOC outdoor CAT6 gel-filled shielded cable designed for underground or heavy outdoor laying.",
                specs: { "Brand": "HOC", "Type": "Outdoor Shielded", "Length": "305m Box" }
            },
            {
                id: 18,
                name: "HOC High Speed HDMI 2.0 Cable (3 Meters)",
                brand: "HOC",
                category: "Networking",
                sku: "HOC-HDMI-3M",
                price: "₹499",
                priceValue: 499,
                stock: "In Stock",
                image: "https://hoc-technologies.com/wp-content/uploads/2025/03/1_result-24-600x600.webp",
                thumbnails: ["https://hoc-technologies.com/wp-content/uploads/2025/03/1_result-24-600x600.webp","https://hoc-technologies.com/wp-content/uploads/2025/03/3_result-23-600x600.webp","https://hoc-technologies.com/wp-content/uploads/2025/03/4_result-23-600x600.webp","https://hoc-technologies.com/wp-content/uploads/2025/03/7_result-10-600x600.webp"],
                description: "Gold-plated HOC HDMI 2.0 cable supporting 4K @ 60Hz resolution for NVR/DVR to monitor connection.",
                specs: { "Brand": "HOC", "Length": "3 Meters", "Support": "4K Ultra HD" }
            },
            {
                id: 11,
                name: "Fire Safety Equipment & Maintenance Services",
                brand: "",
                category: "Fire Safety & Services",
                sku: "DTS-SRV-FIRE01",
                price: "On Request",
                priceValue: 0,
                stock: "Available",
                image: "https://m.media-amazon.com/images/I/71qZJO0t61L._SY879_.jpg",
                thumbnails: [
                    "https://m.media-amazon.com/images/I/71qZJO0t61L._SY879_.jpg",
                    "https://m.media-amazon.com/images/I/61a-j+rlc8L._AC_UL320_.jpg",
                    "https://m.media-amazon.com/images/I/71qZJO0t61L._SY879_.jpg"
                ],
                description: "Complete fire safety system installation, fire extinguisher refilling, and maintenance services in Boisar.",
                specs: { "Brand": "", "Location": "Boisar & Nearby" }
            },
            {
                id: 1001,
                name: "Enterprise Network Switch - Managed Gigabit",
                brand: "",
                category: "Networking",
                sku: "DTS-NET-MGS",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://images.unsplash.com/photo-1750711731797-25c3f2551ff8?auto=format&fit=crop&w=1200&q=85",
                thumbnails: ["https://images.unsplash.com/photo-1750711731797-25c3f2551ff8?auto=format&fit=crop&w=1200&q=85"],
                description: "Managed network switching solution for offices, factories, CCTV networks and VLAN-based deployments.",
                specs: { "Type": "Managed Gigabit Switch", "Use": "LAN / VLAN / CCTV", "Deployment": "Office & Industrial" }
            },
            {
                id: 1002,
                name: "Enterprise Wi-Fi Access Point",
                brand: "",
                category: "IT Infrastructure",
                sku: "DTS-WIFI-AP",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=900&q=80",
                thumbnails: ["https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=900&q=80"],
                description: "Business Wi-Fi solution with planned access-point placement, configuration and secure wireless networking.",
                specs: { "Application": "Office / Factory / Campus", "Service": "Supply & Configuration", "Security": "Enterprise Wi-Fi" }
            },
            {
                id: 1003,
                name: "METRAC Server & Network Rack Solutions",
                brand: "Metrac",
                category: "IT Infrastructure",
                sku: "METRAC-RACK-SOLUTIONS",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://metrac.in/wp-content/uploads/2019/02/METRAC-1-654x494.jpg",
                thumbnails: ["https://metrac.in/wp-content/uploads/2019/02/METRAC-1-654x494.jpg", "https://metrac.in/wp-content/uploads/2019/02/METRAC-03-654x494.jpg"],
                description: "METRAC server and network rack solutions. Choose from the METRAC rack products listed in this catalogue; confirm exact configuration, dimensions, availability and quotation with DTS.",
                specs: { "Brand": "METRAC", "Application": "Server Room / Network Room", "Solution": "Server & Network Rack Systems", "Quotation": "Requirement Based" }
            },
            {
                id: 1004,
                name: "NAS & Backup Storage Solution",
                brand: "",
                category: "IT Infrastructure",
                sku: "DTS-NAS-BACKUP",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://cdn.imweb.me/thumbnail/20221111/fec4114f9e85f.jpg",
                thumbnails: ["https://cdn.imweb.me/thumbnail/20221111/fec4114f9e85f.jpg"],
                description: "Centralized NAS and backup solution for business data, file sharing and storage management.",
                specs: { "Application": "Business Data", "Features": "Central Storage / Backup", "Service": "Setup & Configuration" }
            },
            {
                id: 1005,
                name: "Structured CAT6 / CAT6A Cabling",
                brand: "",
                category: "Networking",
                sku: "DTS-CAT6-INFRA",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://www.bonelinks.com/wp-content/uploads/2023/08/data-center-cabling.jpg",
                thumbnails: ["https://www.bonelinks.com/wp-content/uploads/2023/08/data-center-cabling.jpg","https://www.racksolutions.com/news/app/uploads/AdobeStock_103754730-cables-4-scaled.jpeg"],
                description: "Structured copper cabling for office, industrial and CCTV network infrastructure.",
                specs: { "Cable": "CAT6 / CAT6A", "Application": "LAN / CCTV / VoIP", "Service": "Installation & Testing" }
            },
            {
                id: 1006,
                name: "Fiber Optic Networking Solution",
                brand: "",
                category: "Networking",
                sku: "DTS-FIBER-NET",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://www.pilsedu.cz/images/articles/informatika/spravna_sit/03-kabelaz/SFP_komplet.png",
                thumbnails: ["https://www.pilsedu.cz/images/articles/informatika/spravna_sit/03-kabelaz/SFP_komplet.png"],
                description: "Fiber backbone, termination, SFP and link testing for long-distance and high-reliability networks.",
                specs: { "Type": "Fiber Optic", "Application": "Campus / Industrial", "Service": "Termination & Testing" }
            },
            {
                id: 1007,
                name: "Firewall & Network Security Solution",
                brand: "",
                category: "IT Infrastructure",
                sku: "DTS-FW-SEC",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://images-cdn.ubuy.co.in/642db74a3bfd3538c736a0e7-fortinet-fortigate-fg-400f-network.jpg",
                thumbnails: ["https://images-cdn.ubuy.co.in/642db74a3bfd3538c736a0e7-fortinet-fortigate-fg-400f-network.jpg"],
                description: "Network security planning including firewall deployment, segmentation and secure internet access.",
                specs: { "Application": "Business Network", "Functions": "Firewall / Security", "Service": "Configuration" }
            },
            {
                id: 1008,
                name: "Industrial Electrical Power Distribution Panel",
                brand: "",
                category: "Electrical",
                sku: "DTS-EL-PANEL",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://images.unsplash.com/photo-1780034766295-43db0f2a0fb7?auto=format&fit=crop&w=1200&q=85",
                thumbnails: ["https://images.unsplash.com/photo-1780034766295-43db0f2a0fb7?auto=format&fit=crop&w=1200&q=85"],
                description: "Industrial electrical power distribution panel solutions for commercial and industrial applications.",
                specs: { "Application": "Industrial / Commercial", "Service": "Design / Supply / Installation", "Type": "Power Distribution" }
            },
            {
                id: 1009,
                name: "Access Control System",
                brand: "",
                category: "Access Control",
                sku: "DTS-ACS-SYS",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://graphax.hu/tarhely/kepek/acarad.jpg",
                thumbnails: ["https://graphax.hu/tarhely/kepek/acarad.jpg"],
                description: "Door access control solutions with biometric, RFID and exit management options.",
                specs: { "Options": "Biometric / RFID", "Application": "Office / Factory", "Service": "Installation & Configuration" }
            },
            {
                id: 1010,
                name: "IT Infrastructure AMC & Maintenance",
                brand: "",
                category: "Services",
                sku: "DTS-IT-AMC",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available",
                image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=80",
                thumbnails: ["https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=80"],
                description: "Annual maintenance and technical support for networking, IT infrastructure, CCTV and related systems.",
                specs: { "Service": "AMC / Maintenance", "Coverage": "IT / Network / Security", "Support": "Scheduled & Breakdown" }
            },
            {
                id: 1011,
                name: "Network Installation & Configuration",
                brand: "",
                category: "Services",
                sku: "DTS-NET-INSTALL",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available",
                image: "https://iis.vn/%40dmin/js/ckfinder/userfiles/images/DuAn/FWD/z1560594231406_a0a59c0d49a71719d733650ce6a76806.jpg",
                thumbnails: ["https://iis.vn/%40dmin/js/ckfinder/userfiles/images/DuAn/FWD/z1560594231406_a0a59c0d49a71719d733650ce6a76806.jpg","https://www.bonelinks.com/wp-content/uploads/2023/08/data-center-cabling.jpg"],
                description: "Complete LAN, Wi-Fi, switch, rack, fiber and network configuration services.",
                specs: { "Service": "Installation / Configuration", "Networks": "LAN / Wi-Fi / Fiber", "Support": "Site Deployment" }
            },
            {
                id: 1012,
                name: "Fire Alarm & Safety System",
                brand: "",
                category: "Fire Safety & Services",
                sku: "DTS-FIRE-SAFE",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://image.made-in-china.com/2f0j00eIYGMObBlVow/Addressable-Fire-Alarm-Panel-Smoke-Detector-Advance-Fire-Alarm-for-Fire-Alarm-System.jpg",
                thumbnails: ["https://image.made-in-china.com/2f0j00eIYGMObBlVow/Addressable-Fire-Alarm-Panel-Smoke-Detector-Advance-Fire-Alarm-for-Fire-Alarm-System.jpg"],
                description: "Fire alarm and safety solutions with system installation, maintenance and support.",
                specs: { "Application": "Commercial / Industrial", "Service": "Supply / Installation / AMC", "Focus": "Fire Safety" }
            },
            {
                id: 3001,
                name: "DTS Business Laptop Solution",
                brand: "DTS",
                category: "IT Asset",
                sku: "DTS-IT-LAPTOP",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available on Request",
                image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85",
                thumbnails: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85","https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=85"],
                officialUrl: "",
                description: "DTS-supplied business laptop solution for office, industrial and field teams.",
                specs: {"Solution":"Business Laptop","Configuration":"Requirement Based","Brand":"DTS Solution","Supply":"DTS"}
            },
            {
                id: 3002,
                name: "DTS Business Desktop PC Solution",
                brand: "DTS",
                category: "IT Asset",
                sku: "DTS-IT-DESKTOP",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available on Request",
                image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=85",
                thumbnails: ["https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=85","https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1200&q=85"],
                officialUrl: "",
                description: "DTS-supplied desktop computing solution for office and industrial workstations.",
                specs: {"Solution":"Business Desktop","Configuration":"Requirement Based","Brand":"DTS Solution","Supply":"DTS"}
            },
            {
                id: 3003,
                name: "DTS Business Monitor & Display",
                brand: "DTS",
                category: "IT Asset",
                sku: "DTS-IT-MONITOR",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available on Request",
                image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=85",
                thumbnails: ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=85","https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=1200&q=85"],
                officialUrl: "",
                description: "DTS-supplied monitor and display solution for workstations and control rooms.",
                specs: {"Solution":"Monitor / Display","Size":"Requirement Based","Brand":"DTS Solution","Supply":"DTS"}
            },
            {
                id: 3004,
                name: "DTS Network Printer & MFP Solution",
                brand: "DTS",
                category: "IT Asset",
                sku: "DTS-IT-PRINTER",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available on Request",
                image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=85",
                thumbnails: ["https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=85"],
                officialUrl: "",
                description: "DTS-supplied network printer and multifunction printer solution with installation and network configuration.",
                specs: {"Solution":"Printer / MFP","Connectivity":"USB / Network","Brand":"DTS Solution","Supply":"DTS"}
            },
            {
                id: 3005,
                name: "DTS UPS & Power Backup Solution",
                brand: "DTS",
                category: "IT Asset",
                sku: "DTS-IT-UPS",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available on Request",
                image: "https://images.unsplash.com/photo-1754928864335-608149b7f6a9?auto=format&fit=crop&w=1200&q=85",
                thumbnails: ["https://images.unsplash.com/photo-1754928864335-608149b7f6a9?auto=format&fit=crop&w=1200&q=85"],
                officialUrl: "",
                description: "DTS-supplied UPS and backup power solution for critical IT assets.",
                specs: {"Solution":"UPS / Backup Power","Capacity":"Requirement Based","Brand":"DTS Solution","Supply":"DTS"}
            },
            {
                id: 3006,
                name: "DTS Server & Storage Solution",
                brand: "DTS",
                category: "IT Asset",
                sku: "DTS-IT-SERVER",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available on Request",
                image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85",
                thumbnails: ["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85","https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=1200&q=85"],
                officialUrl: "",
                description: "DTS-supplied server, NAS and storage infrastructure solution.",
                specs: {"Solution":"Server / NAS / Storage","Capacity":"Requirement Based","Brand":"DTS Solution","Supply":"DTS"}
            },
            {
                id: 3008,
                name: "DTS Office IT Asset Setup",
                brand: "DTS",
                category: "IT Asset",
                sku: "DTS-IT-OFFICE",
                price: "Get Quote",
                priceValue: 0,
                stock: "Site Survey / Requirement Based",
                image: "https://www.grainmond.com/assets/product-it-DsIW3Dqa.jpg",
                thumbnails: ["https://www.grainmond.com/assets/product-it-DsIW3Dqa.jpg","https://cdn.goclick.vn/mediacenter/media/images/2209/news/ava/9131e75c7bfeafa0f6ef61-1697392143.jpg"],
                officialUrl: "",
                description: "Complete DTS office IT asset deployment including computers, displays, printers, UPS and networking.",
                specs: {"Solution":"Complete IT Asset Setup","Scope":"Supply + Installation + Configuration","Brand":"DTS Solution","Support":"DTS"}
            },
            {
                id: 2001,
                name: "24 Port PoE Switch (24+2 Giga)",
                brand: "Prizor",
                category: "Networking",
                sku: "RP-POE2402",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://m.media-amazon.com/images/I/71-XIMb24pL._SX425_.jpg",
                thumbnails: ["https://m.media-amazon.com/images/I/71-XIMb24pL._SX425_.jpg","https://m.media-amazon.com/images/I/61X3yksTcXL._SX425_.jpg"],
                officialUrl: "https://www.prizor.in/product/24-port-giga-poe-switch/",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "RP-POE2402", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2002,
                name: "16 Port PoE Switch (16+2 Giga, 1 SFP)",
                brand: "Prizor",
                category: "Networking",
                sku: "RP-POE1602-SF",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://5.imimg.com/data5/SELLER/Default/2025/3/495122711/HU/UV/FC/216336728/prizor-rp-poe1602-sf-16-port-poe-switch-500x500.jpg",
                thumbnails: ["https://5.imimg.com/data5/SELLER/Default/2025/3/495122711/HU/UV/FC/216336728/prizor-rp-poe1602-sf-16-port-poe-switch-500x500.jpg","https://5.imimg.com/data5/SELLER/PDFImage/2025/3/495095174/GD/CP/RZ/216336728/prizor-rp-poe1602-sf-16-port-poe-switch-500x500.png","https://5.imimg.com/data5/SELLER/PDFImage/2025/3/495095175/VP/FV/DT/216336728/prizor-rp-poe1602-sf-16-port-poe-switch-500x500.png"],
                officialUrl: "https://www.prizor.in/products/RP-POE1602-SF",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "RP-POE1602-SF", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2003,
                name: "16 Port PoE Switch (16+2 Giga)",
                brand: "Prizor",
                category: "Networking",
                sku: "RP-POE1602",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://prizor.in/wp-content/uploads/2024/04/poe-switch-1-768x768.png",
                thumbnails: ["https://prizor.in/wp-content/uploads/2024/04/poe-switch-1-768x768.png"],
                officialUrl: "https://www.prizor.in/products/RP-POE1602",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "RP-POE1602", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2004,
                name: "8 Port PoE Switch (8+2 Giga, 1 SFP)",
                brand: "Prizor",
                category: "Networking",
                sku: "RP-POE0802-SF",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://5.imimg.com/data5/SELLER/Default/2026/3/592422650/XA/NW/MM/44525462/prizor-rp-poe0802-sf-8-port-poe-switch-1000x1000.jpg",
                thumbnails: ["https://5.imimg.com/data5/SELLER/Default/2026/3/592422650/XA/NW/MM/44525462/prizor-rp-poe0802-sf-8-port-poe-switch-1000x1000.jpg"],
                officialUrl: "https://www.prizor.in/products/RP-POE0802-SF",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "RP-POE0802-SF", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2005,
                name: "8 Port PoE Switch (8+2 Giga)",
                brand: "Prizor",
                category: "Networking",
                sku: "RP-POE0821",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRiQtelXQgAEv4VpuHZXxO8krsHRmaegn3P-NC-MHzhjStEUNu6SeVEwV8IBGZcXePdBYD8hgP1Wzcr5GGgcjdhJeJZ6rGjPv4K5A9mc9kJJb_75r-8La7582vGk_wjV4ie7pJhOm2dRW4&usqp=CAc",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRiQtelXQgAEv4VpuHZXxO8krsHRmaegn3P-NC-MHzhjStEUNu6SeVEwV8IBGZcXePdBYD8hgP1Wzcr5GGgcjdhJeJZ6rGjPv4K5A9mc9kJJb_75r-8La7582vGk_wjV4ie7pJhOm2dRW4&usqp=CAc"],
                officialUrl: "https://www.prizor.in/products/RP-POE0821",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "RP-POE0821", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2006,
                name: "8 Port PoE Switch",
                brand: "Prizor",
                category: "Networking",
                sku: "RP-POE0802",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSRk7dSPvQAmqG6uqBO0h_B71Z96_Acf8zdn0Lf-k-nQ&s",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSRk7dSPvQAmqG6uqBO0h_B71Z96_Acf8zdn0Lf-k-nQ&s"],
                officialUrl: "https://www.prizor.in/products/RP-POE0802",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "RP-POE0802", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2007,
                name: "4 Port PoE Switch (4+2 Giga)",
                brand: "Prizor",
                category: "Networking",
                sku: "RP-POE0421",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIOF61smTbbKyRku55onbLNQkcdpBg8zHV1tlqh_q9TQ&s=10",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIOF61smTbbKyRku55onbLNQkcdpBg8zHV1tlqh_q9TQ&s=10"],
                officialUrl: "https://www.prizor.in/products/RP-POE0421",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "RP-POE0421", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2008,
                name: "4 Port PoE Switch",
                brand: "Prizor",
                category: "Networking",
                sku: "RP-POE0402",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQ6U7CNA-g9GcXI3bA4mOQwovtfcPNcPWnFp-m2ertRQ&s=10",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQ6U7CNA-g9GcXI3bA4mOQwovtfcPNcPWnFp-m2ertRQ&s=10"],
                officialUrl: "https://www.prizor.in/product/4-port-poe-switch/",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "RP-POE0402", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2009,
                name: "2MP IP ColorView Varifocal Dome — PR-RT-MD24DCA-120M",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PR-RT-MD24DCA-120M",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://www.prizor.in/Dome-camera/PXT-20/PXT-20MIR30D60.png",
                thumbnails: ["https://www.prizor.in/Dome-camera/PXT-20/PXT-20MIR30D60.png"],
                officialUrl: "https://www.prizor.in/products/PR-RT-MD24DCA-120M",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "PR-RT-MD24DCA-120M", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2011,
                name: "2MP IP ColorView Plastic Dome — PR-RT-PD24DCA-28",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PR-RT-PD24DCA-28",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://prizor.in/wp-content/uploads/2025/09/PR-RT-PD24DCA-28-768x768.png",
                thumbnails: ["https://prizor.in/wp-content/uploads/2025/09/PR-RT-PD24DCA-28-768x768.png"],
                officialUrl: "https://www.prizor.in/products/PR-RT-PD24DCA-28",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "PR-RT-PD24DCA-28", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2012,
                name: "2MP IP ColorView Metal Dome — PR-RT-MD24DCA-28",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PR-RT-MD24DCA-28",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://www.prizor.in/Dome-camera/PXT-20/PXT-20MIR30D60.png",
                thumbnails: ["https://www.prizor.in/Dome-camera/PXT-20/PXT-20MIR30D60.png"],
                officialUrl: "https://www.prizor.in/products/PR-RT-MD24DCA-28",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "PR-RT-MD24DCA-28", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2014,
                name: "2MP IP ColorView Varifocal Bullet — PR-RT-MB24DCA-120M",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PR-RT-MB24DCA-120M",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://www.prizor.in/Bullet-camera/PR-RT-MB24DCA-40.png",
                thumbnails: ["https://www.prizor.in/Bullet-camera/PR-RT-MB24DCA-40.png"],
                officialUrl: "https://www.prizor.in/products/PR-RT-MB24DCA-120M",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "PR-RT-MB24DCA-120M", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2018,
                name: "2MP IP ColorView Metal Bullet — PR-RT-MB24DCA-60",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "PR-RT-MB24DCA-60",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://www.prizor.in/Bullet-camera/PR-RT-MB24DCA-40.png",
                thumbnails: ["https://www.prizor.in/Bullet-camera/PR-RT-MB24DCA-40.png"],
                officialUrl: "https://www.prizor.in/products/PR-RT-MB24DCA-60",
                description: "Official Prizor catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Model": "PR-RT-MB24DCA-60", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2019,
                name: "CCTV CABLE 3+1 OUTDOOR 90M – PRAGATI",
                brand: "HOC",
                category: "Networking",
                sku: "PRAGATI",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://cdn.moglix.com/p/Xsqz3r30ZtIgQ.jpg",
                thumbnails: ["https://cdn.moglix.com/p/Xsqz3r30ZtIgQ.jpg"],
                officialUrl: "https://hoc-technologies.com/product/cctv-cable-31-outdoor-90m-pragati/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "PRAGATI", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2020,
                name: "CCTV CABLE 3+1 INDOOR 90M – PRAHAAR",
                brand: "HOC",
                category: "Networking",
                sku: "PRAHAAR",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://services.ibo.com/media/v1/products/images/f9067d5d-aa0f-4ef3-a7ca-73aa20ad9bae/cctv-cable-31-90m-1.jpeg",
                thumbnails: ["https://services.ibo.com/media/v1/products/images/f9067d5d-aa0f-4ef3-a7ca-73aa20ad9bae/cctv-cable-31-90m-1.jpeg"],
                officialUrl: "https://hoc-technologies.com/product/cctv-cable-31-indoor-90m-prahaar/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "PRAHAAR", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2021,
                name: "CAT6 305M ARMOURED CABLE 23AWG – C651ARM(BRAHMOS)",
                brand: "HOC",
                category: "Networking",
                sku: "C651ARM",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://cdn2.zohoecommerce.com/product-images/Cat%2B6%2BCable%2C%2BArmored%2BCable.webp/453927000083858202/600x600?storefront_domain=www.pinekart.com",
                thumbnails: ["https://cdn2.zohoecommerce.com/product-images/Cat%2B6%2BCable%2C%2BArmored%2BCable.webp/453927000083858202/600x600?storefront_domain=www.pinekart.com"],
                officialUrl: "https://hoc-technologies.com/product/cat6-305m-armoured-cable-23awg-c651armbrahmos/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "C651ARM", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2022,
                name: "CAT6 305M PURE COPPER OUTDOOR 0.51MM – C651(PRITHVI)",
                brand: "HOC",
                category: "Networking",
                sku: "C651",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://itcare.com/cdn/shop/files/cat-box-2.jpg?v=1713370312",
                thumbnails: ["https://itcare.com/cdn/shop/files/cat-box-2.jpg?v=1713370312"],
                officialUrl: "https://hoc-technologies.com/product/cat6-305m-pure-copper-outdoor-0-51mm-c651prithvi/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "C651", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2023,
                name: "CAT6 305M PURE COPPER 0.51MM – CAT6(NIRBHAY)",
                brand: "HOC",
                category: "Networking",
                sku: "CAT6-NIRBHAY",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://itcare.com/cdn/shop/files/cat-box-2.jpg?v=1713370312",
                thumbnails: ["https://itcare.com/cdn/shop/files/cat-box-2.jpg?v=1713370312"],
                officialUrl: "https://hoc-technologies.com/product/cat6-305m-pure-copper-0-51mm-cat6nirbhay/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "CAT6-NIRBHAY", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2024,
                name: "CAT6 M-COPPER 305M SFTP OUTDOOR CABLE – CAT6 SFTP M-CU",
                brand: "HOC",
                category: "Networking",
                sku: "CAT6-SFTP-M-CU",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://www.bonelinks.com/wp-content/uploads/2023/08/data-center-cabling.jpg",
                thumbnails: ["https://www.bonelinks.com/wp-content/uploads/2023/08/data-center-cabling.jpg"],
                officialUrl: "https://hoc-technologies.com/product/cat6-m-copper-305m-sftp-outdoor-cable-cat6-sftp-m-cu/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "CAT6-SFTP-M-CU", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2025,
                name: "CAT6 M-COPPER 305M FTP OUTDOOR CABLE – CAT6 FTP M-CU",
                brand: "HOC",
                category: "Networking",
                sku: "CAT6-FTP-M-CU",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://www.bonelinks.com/wp-content/uploads/2023/08/data-center-cabling.jpg",
                thumbnails: ["https://www.bonelinks.com/wp-content/uploads/2023/08/data-center-cabling.jpg"],
                officialUrl: "https://hoc-technologies.com/product/cat6-m-copper-305m-ftp-outdoor-cable-cat6-ftp-m-cu/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "CAT6-FTP-M-CU", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2026,
                name: "CAT6 M-COPPER 305M UTP OUTDOOR DOUBLE COATED – CAT6 305M M-CU",
                brand: "HOC",
                category: "Networking",
                sku: "CAT6-305M-M-CU-OUT",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://www.starakim.com/-22263-12-B.webp",
                thumbnails: ["https://www.starakim.com/-22263-12-B.webp"],
                officialUrl: "https://hoc-technologies.com/product/cat6-m-copper-305m-utp-outdoor-double-coated-cat6-305m-m-cu/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "CAT6-305M-M-CU-OUT", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2027,
                name: "CAT6 M-COPPER 305M UTP CABLE – CAT6 305M M-CU",
                brand: "HOC",
                category: "Networking",
                sku: "CAT6-305M-M-CU",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://www.starakim.com/-22263-12-B.webp",
                thumbnails: ["https://www.starakim.com/-22263-12-B.webp"],
                officialUrl: "https://hoc-technologies.com/product/cat6-m-copper-305m-cable-cat6-305m-m-cu/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "CAT6-305M-M-CU", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2028,
                name: "PURE COPPER CAT6 PATCH CORD – HP6C",
                brand: "HOC",
                category: "Networking",
                sku: "HP6C",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://i.ebayimg.com/images/g/UxcAAOSwfX9gpVAK/s-l1200.jpg",
                thumbnails: ["https://i.ebayimg.com/images/g/UxcAAOSwfX9gpVAK/s-l1200.jpg"],
                officialUrl: "https://hoc-technologies.com/product/pure-copper-cat6-patch-cord-hp6c/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "HP6C", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2029,
                name: "M-COPPER CAT6 PATCH CORD FLEXIBLE – HP6",
                brand: "HOC",
                category: "Networking",
                sku: "HP6",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://i.ebayimg.com/images/g/UxcAAOSwfX9gpVAK/s-l1200.jpg",
                thumbnails: ["https://i.ebayimg.com/images/g/UxcAAOSwfX9gpVAK/s-l1200.jpg"],
                officialUrl: "https://hoc-technologies.com/product/m-copper-cat6-patch-cord-flexible-hp6/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "HP6", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2030,
                name: "PREMIUM POWER CORD LAPTOP – HLP",
                brand: "HOC",
                category: "Networking",
                sku: "HLP",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://i.ebayimg.com/images/g/m~EAAOSwN39i83HK/s-l1600.jpg",
                thumbnails: ["https://i.ebayimg.com/images/g/m~EAAOSwN39i83HK/s-l1600.jpg"],
                officialUrl: "https://hoc-technologies.com/product/premium-power-cord-laptop-hlp/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "HLP", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2031,
                name: "PREMIUM POWER CORD DESKTOP – HDP",
                brand: "HOC",
                category: "Networking",
                sku: "HDP",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://d91ztqmtx7u1k.cloudfront.net/ClientContent/Images/Catalogue/50-hz-pvc-single-phase-dc-powe-20260407203645919.webp",
                thumbnails: ["https://d91ztqmtx7u1k.cloudfront.net/ClientContent/Images/Catalogue/50-hz-pvc-single-phase-dc-powe-20260407203645919.webp"],
                officialUrl: "https://hoc-technologies.com/product/premium-power-cord-desktop-hdp/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "HDP", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2032,
                name: "USB AM/BM PRINTER CABLE PREMIUM MESH – HUP02",
                brand: "HOC",
                category: "Networking",
                sku: "HUP02",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://filebroker-cdn.lazada.com.my/kf/S21534e19a9b7480a891305010639a83an.png",
                thumbnails: ["https://filebroker-cdn.lazada.com.my/kf/S21534e19a9b7480a891305010639a83an.png"],
                officialUrl: "https://hoc-technologies.com/product/usb-am-bm-printer-cable-premium-mesh-hup02/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "HUP02", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2033,
                name: "USB AM/BM PRINTER CABLE PRO – HUP01",
                brand: "HOC",
                category: "Networking",
                sku: "HUP01",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://filebroker-cdn.lazada.com.my/kf/S21534e19a9b7480a891305010639a83an.png",
                thumbnails: ["https://filebroker-cdn.lazada.com.my/kf/S21534e19a9b7480a891305010639a83an.png"],
                officialUrl: "https://hoc-technologies.com/product/usb-am-bm-printer-cable-pro-hup01/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "HUP01", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 2034,
                name: "USB AM/AF EXTENSION CABLE PREMIUM MESH – HUEX02",
                brand: "HOC",
                category: "Networking",
                sku: "HUEX02",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://filebroker-cdn.lazada.com.my/kf/S21534e19a9b7480a891305010639a83an.png",
                thumbnails: ["https://filebroker-cdn.lazada.com.my/kf/S21534e19a9b7480a891305010639a83an.png"],
                officialUrl: "https://hoc-technologies.com/product/usb-am-af-extension-cable-premium-mesh-huex02/",
                description: "Official HOC catalogue product. Exact specification, availability and quotation can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Model": "HUEX02", "Source": "Official manufacturer catalogue" }
            },
            {
                id: 4001,
                name: "Prizor 4MP Outdoor PoE IP Security Camera",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "DTS-PRZ-4MP-POE-OUT",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2r28-Mr3PRb-5UCE7pgG8S6yPb3cVrtR68eMc8wcVLA&s",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2r28-Mr3PRb-5UCE7pgG8S6yPb3cVrtR68eMc8wcVLA&s"],
                description: "Prizor 4MP outdoor PoE IP security camera for professional CCTV installations. Exact model specification and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Resolution": "4 MP", "Connectivity": "PoE / IP", "Use": "Outdoor security" }
            },
            {
                id: 4002,
                name: "Prizor Smart Wi-Fi Wireless PTZ Security Camera",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "DTS-PRZ-WIFI-PTZ",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2r28-Mr3PRb-5UCE7pgG8S6yPb3cVrtR68eMc8wcVLA&s",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2r28-Mr3PRb-5UCE7pgG8S6yPb3cVrtR68eMc8wcVLA&s"],
                description: "Prizor smart Wi-Fi wireless PTZ security camera for remote monitoring and flexible surveillance coverage. Exact model specification and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Type": "Wi-Fi PTZ", "Connectivity": "Wireless / Wi-Fi", "Use": "Security monitoring" }
            },
            {
                id: 4003,
                name: "Prizor 8-Channel Network Video Recorder (NVR)",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "DTS-PRZ-NVR-8CH",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbLC6ZuizDXCvLspy3aOTH7Ba6-9aghB9K-iiWEeUCEg&s=10",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbLC6ZuizDXCvLspy3aOTH7Ba6-9aghB9K-iiWEeUCEg&s=10"],
                description: "Prizor 8-channel Network Video Recorder for IP CCTV recording and video management. Exact model specification and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Channels": "8 CH", "Type": "Network Video Recorder", "Use": "IP CCTV recording" }
            },
            {
                id: 4004,
                name: "Prizor 8-Channel Digital Video Recorder (DVR)",
                brand: "Prizor",
                category: "CCTV & Surveillance",
                sku: "DTS-PRZ-DVR-8CH",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHTpeW-eGB1AfZwym_ZrOo-NqTWpq-lCydBwZhkliqOQ&s",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHTpeW-eGB1AfZwym_ZrOo-NqTWpq-lCydBwZhkliqOQ&s"],
                description: "Prizor 8-channel Digital Video Recorder for compatible CCTV camera systems. Exact model specification and quotation can be confirmed by DTS.",
                specs: { "Brand": "Prizor", "Channels": "8 CH", "Type": "Digital Video Recorder", "Use": "CCTV recording" }
            },
            {
                id: 4005,
                name: "HOC Structured CAT6 Pure Copper LAN Cable",
                brand: "HOC",
                category: "Networking",
                sku: "DTS-HOC-CAT6-PURE-CU",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://itcare.com/cdn/shop/files/cat-box-2.jpg?v=1713370312",
                thumbnails: ["https://itcare.com/cdn/shop/files/cat-box-2.jpg?v=1713370312"],
                description: "HOC structured CAT6 pure copper LAN cabling solution for reliable networking and structured infrastructure installations. Exact cable length and model can be confirmed by DTS.",
                specs: { "Brand": "HOC", "Category": "Structured Cabling", "Cable": "CAT6", "Conductor": "Pure Copper" }
            },
            {
                id: 4007,
                name: "Engineering Contracting & Annual Maintenance Contract (AMC)",
                brand: "Dynamic Technology Solutions",
                category: "Services",
                sku: "DTS-ENG-AMC",
                price: "Get Quote",
                priceValue: 0,
                stock: "Available",
                image: "https://thoughtful-light-1b47605436.media.strapiapp.com/blog_pdm_maintenance_strategies_using_software_to_plan_and_execute_shutdowns_1760498956535_1760498960957_d8d34d8530.png",
                thumbnails: ["https://thoughtful-light-1b47605436.media.strapiapp.com/blog_pdm_maintenance_strategies_using_software_to_plan_and_execute_shutdowns_1760498956535_1760498960957_d8d34d8530.png"],
                description: "Engineering contracting and annual maintenance services for CCTV, networking, IT infrastructure, electrical, fire safety, access control and related systems.",
                specs: { "Provider": "Dynamic Technology Solutions", "Service": "Engineering Contracting & AMC", "Coverage": "Technical systems and infrastructure" }
            },
            {
                id: 4008,
                name: "Advanced Fire Alarm & Safety Suppression System",
                brand: "Dynamic Technology Solutions",
                category: "Fire Safety",
                sku: "DTS-FIRE-ADVANCED",
                price: "Get Quote",
                priceValue: 0,
                stock: "On Request",
                image: "https://image.made-in-china.com/2f0j00eIYGMObBlVow/Addressable-Fire-Alarm-Panel-Smoke-Detector-Advance-Fire-Alarm-for-Fire-Alarm-System.jpg",
                thumbnails: ["https://image.made-in-china.com/2f0j00eIYGMObBlVow/Addressable-Fire-Alarm-Panel-Smoke-Detector-Advance-Fire-Alarm-for-Fire-Alarm-System.jpg"],
                description: "Advanced fire alarm and safety suppression system solution for commercial and industrial applications. System design and equipment selection depend on site requirements.",
                specs: { "Provider": "Dynamic Technology Solutions", "Category": "Fire Safety", "System": "Fire Alarm & Suppression", "Application": "Commercial / Industrial" }
            },
            {
                id: 4010,
                name: "METRAC 4U Wall Mount Network Rack",
                brand: "Metrac",
                category: "Networking",
                sku: "MR-WNR-5545-4U",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://metrac.in/wp-content/uploads/2025/12/4U-654x494.jpeg",
                thumbnails: [
                    "https://metrac.in/wp-content/uploads/2025/12/4U-654x494.jpeg",
                    "https://metrac.in/wp-content/uploads/2019/02/METRAC-1-654x494.jpg"
                ],
                officialUrl: "https://metrac.in/service/4u-networ-rack/",
                description: "METRAC wall-mount network rack for CCTV and networking equipment. Product image and reference information are from the manufacturer's website; confirm exact model, stock, price and delivery with DTS.",
                specs: { "Brand": "METRAC", "Model": "MR-WNR-5545-4U", "Size": "W 550 × D 450 × H 250 mm", "Source": "metrac.in" }
            },
            {
                id: 4011,
                name: "METRAC 6U Wall Mount Network Rack",
                brand: "Metrac",
                category: "Networking",
                sku: "MR-WNR-5545-6U",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://metrac.in/wp-content/uploads/2025/12/6U-512x494.jpeg",
                thumbnails: [
                    "https://metrac.in/wp-content/uploads/2025/12/6U-512x494.jpeg",
                    "https://metrac.in/wp-content/uploads/2025/12/WhatsApp-Image-2025-09-22-at-2.33.04-PM-512x494.jpeg"
                ],
                officialUrl: "https://metrac.in/service/6u-networ-rack/",
                description: "METRAC 6U wall-mount rack designed for CCTV and network equipment. Confirm exact dimensions, stock, price and delivery with DTS before ordering.",
                specs: { "Brand": "METRAC", "Model": "MR-WNR-5545-6U", "Type": "Wall Mount", "Source": "metrac.in" }
            },
            {
                id: 4012,
                name: "METRAC 22U Floor Standing Network Rack",
                brand: "Metrac",
                category: "Networking",
                sku: "METRAC-22U-NETWORK-RACK",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://metrac.in/wp-content/uploads/2025/12/22U-294x494.jpeg",
                thumbnails: [
                    "https://metrac.in/wp-content/uploads/2025/12/22U-294x494.jpeg",
                    "https://metrac.in/wp-content/uploads/2019/02/METRAC-03-654x494.jpg"
                ],
                officialUrl: "https://metrac.in/service/22-u/",
                description: "METRAC floor-standing network rack for networking and server-room installations. Exact dimensions, accessories, stock and quotation need confirmation from DTS.",
                specs: { "Brand": "METRAC", "Model": "22U Network Rack", "Type": "Floor Standing", "Source": "metrac.in" }
            },
            {
                id: 4013,
                name: "METRAC Outdoor Network Rack",
                brand: "Metrac",
                category: "Networking",
                sku: "METRAC-OUTDOOR-RACK",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://metrac.in/wp-content/uploads/2019/02/METRAC-02-654x494.jpg",
                thumbnails: [
                    "https://metrac.in/wp-content/uploads/2019/02/METRAC-02-654x494.jpg",
                    "https://metrac.in/wp-content/uploads/2019/02/METRAC-1-654x494.jpg"
                ],
                officialUrl: "https://metrac.in/service/outdoor-rack/",
                description: "METRAC outdoor network enclosure for CCTV and networking installations. The manufacturer's website lists IP63 weather protection for its outdoor rack range; confirm the exact model and suitability with DTS.",
                specs: { "Brand": "METRAC", "Type": "Outdoor Network Rack", "Protection": "IP63 listed for outdoor rack range", "Source": "metrac.in" }
            },
            {
                id: 2035,
                name: "HOC USB 3.0 Hub 4 Port – ATRI",
                brand: "HOC",
                category: "IT Asset",
                sku: "ATRI",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://m.media-amazon.com/images/I/81GAYQT8jlL.jpg",
                thumbnails: ["https://m.media-amazon.com/images/I/81GAYQT8jlL.jpg"],
                officialUrl: "https://hoc-technologies.com/product/usb-3-0-hub-4-port-atri/",
                description: "HOC USB 3.0 four-port hub for HDD, SSD, pen drive, keyboard, mouse and other USB peripherals.",
                specs: {"Brand":"HOC","Model":"ATRI","Ports":"4 × USB 3.0","Transfer":"Up to 5 Gbps","Use":"USB peripheral expansion"}
            },
            {
                id: 2036,
                name: "HOC USB 7.1CH Sound Adapter – HUS7",
                brand: "HOC",
                category: "IT Asset",
                sku: "HUS7",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOlMrbs8IAb7fcA9mX08ePX3Gp-kdkBsh9q0n-R5dkxg&s=10",
                thumbnails: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOlMrbs8IAb7fcA9mX08ePX3Gp-kdkBsh9q0n-R5dkxg&s=10"],
                officialUrl: "https://hoc-technologies.com/product/usb-to-sound-7-1ch-adapter-hus7/",
                description: "HOC USB audio adapter for computers, meetings, headsets and multimedia use.",
                specs: {"Brand":"HOC","Model":"HUS7","Audio":"7.1CH USB Sound","Ports":"3.5mm audio + mic","Compatibility":"Windows / macOS / Linux"}
            },
            {
                id: 2037,
                name: "HOC HDMI Extender 200M KVM IP – HHE-200LKVM",
                brand: "HOC",
                category: "IT Infrastructure",
                sku: "HHE-200LKVM",
                price: "Get Quote",
                priceValue: 0,
                stock: "Check Availability",
                image: "https://m.media-amazon.com/images/I/61ciWkNor0L._SX679_.jpg",
                thumbnails: [
                    "https://m.media-amazon.com/images/I/61ciWkNor0L._SX679_.jpg",
                    "https://m.media-amazon.com/images/I/61K+Kv998lL._SX569_.jpg",
                    "https://m.media-amazon.com/images/I/81ph346OB1L._SL1500_.jpg",
                    "https://m.media-amazon.com/images/I/81qaOeA2sbL._SL1500_.jpg",
                    "https://m.media-amazon.com/images/I/81ECgWmuQqL._SL1500_.jpg",
                    "https://m.media-amazon.com/images/I/81mD-iKOlTL._SL1500_.jpg"
                ],
                officialUrl: "https://hoc-technologies.com/product/hdmi-extender-200m-kvm-ip-hdmiusbir-hhe-200lkvm/",
                description: "HOC HDMI-over-Cat5e/6 extender for long-distance display, audio, IR and KVM control.",
                specs: {"Brand":"HOC","Model":"HHE-200LKVM","Distance":"Up to 200m","Transport":"Single Cat5e/Cat6 cable","KVM":"USB mouse/keyboard support"}
            }
        ];

        const DTS_AI_API = "https://dts-tech-solutions.onrender.com/api/chat";
        let aiMessages = [];

        function escapeHtml(value) {

            if (value === null || value === undefined) {
                return '';
            }

            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

        }


        /* =========================================================
           HELPER: ESCAPE JAVASCRIPT STRING
           ========================================================= */

        function escapeJsString(value) {

            if (value === null || value === undefined) {
                return '';
            }

            return String(value)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\r?\n/g, ' ');

        }


        /* =========================================================
           CATEGORY ICON
           ========================================================= */

        function getCategoryIcon(category) {

            const icons = {

                'CCTV & Surveillance':
                    'fa-video',

                'IT Infrastructure':
                    'fa-server',

                'Networking':
                    'fa-network-wired',

                'Electrical':
                    'fa-bolt',

                'Fire Safety & Services':
                    'fa-fire-extinguisher',

                'Access Control':
                    'fa-id-card',

                'Services':
                    'fa-screwdriver-wrench'

            };

            return icons[category] || 'fa-box';


        }


        /* =========================================================
           CATEGORY COLOR
           ========================================================= */

        function getCategoryColor(category) {

            const colors = {

                'CCTV & Surveillance':
                    'bg-blue-50 text-blue-700',

                'IT Infrastructure':
                    'bg-violet-50 text-violet-700',

                'Networking':
                    'bg-cyan-50 text-cyan-700',

                'Electrical':
                    'bg-amber-50 text-amber-700',

                'Fire Safety & Services':
                    'bg-red-50 text-red-700',

                'Access Control':
                    'bg-emerald-50 text-emerald-700',

                'Services':
                    'bg-slate-100 text-slate-700'

            };

            return colors[category] ||
                   'bg-slate-100 text-slate-700';

        }


        /* =========================================================
           PRODUCT IMAGE
           ========================================================= */

        function getProductImage(product) {

            if (!product) {
                return '';
            }

            if (product.image) {
                return product.image;
            }

            if (
                Array.isArray(product.thumbnails) &&
                product.thumbnails.length > 0
            ) {
                return product.thumbnails[0];
            }

            return '';

        }


        /* =========================================================
           PRODUCT IMAGE LIST
           ========================================================= */

        function getProductImages(product) {

            if (!product) {
                return [];
            }

            const images = [];

            if (product.image) {
                images.push(product.image);
            }

            if (
                Array.isArray(product.thumbnails)
            ) {

                product.thumbnails.forEach(function(image) {

                    if (
                        image &&
                        !images.includes(image)
                    ) {
                        images.push(image);
                    }

                });

            }

            return images;

        }


        /* =========================================================
           BRAND BADGE
           ========================================================= */

        function getBrandBadge(product) {

            if (
                !product ||
                !product.brand ||
                String(product.brand).trim() === ''
            ) {
                return '';
            }

            return `
                <div class="product-brand">
                    <i class="fa-solid fa-tag"></i>
                    ${escapeHtml(product.brand)}
                </div>
            `;

        }


        /* =========================================================
           SUPPLIER / COMPANY ATTRIBUTION
           ========================================================= */

        function getSupplierBadge(product) {

            if (!product) {
                return '';
            }

            /*
             * If an actual manufacturer brand exists,
             * do not replace or modify it.
             *
             * For generic/unbranded products we show DTS as
             * supplier/installer, NOT as manufacturer.
             */

            if (
                !product.brand ||
                String(product.brand).trim() === ''
            ) {

                return `
                    <div class="supplier-badge">
                        <i class="fa-solid fa-building"></i>
                        Supplied & Installed by Dynamic Technology Solutions
                    </div>
                `;

            }

            return '';

        }


        /* =========================================================
           STOCK BADGE
           ========================================================= */

        function getStockBadge(product) {

            const stock =
                product && product.stock
                    ? String(product.stock)
                    : 'On Request';

            const lowerStock =
                stock.toLowerCase();

            let colorClass =
                'text-green-700';

            if (
                lowerStock.includes('request') ||
                lowerStock.includes('order')
            ) {

                colorClass =
                    'text-amber-700';

            }

            return `
                <div class="stock-badge ${colorClass}">
                    <i class="fa-solid fa-circle-check mr-1"></i>
                    ${escapeHtml(stock)}
                </div>
            `;

        }


        /* =========================================================
           PRODUCT SEARCH TEXT
           ========================================================= */

        function getProductSearchText(product) {

            if (!product) {
                return '';
            }

            let text = [

                product.name,
                product.brand,
                product.category,
                product.sku,
                product.description,
                product.price,
                product.stock

            
        ];


            if (product.specs) {

                Object.keys(product.specs)
                    .forEach(function(key) {

                        text.push(key);
                        text.push(product.specs[key]);

                    });

            }

            return text
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

        }


        /* =========================================================
           PRODUCT MATCH
           ========================================================= */

        function productMatchesSearch(product, query) {

            if (!query) {
                return true;
            }

            return getProductSearchText(product)
                .includes(query.toLowerCase().trim());

        }


        /* =========================================================
           PRODUCT FILTER
           ========================================================= */

        function getFilteredProducts() {

            let filtered =
                Array.isArray(products)
                    ? [...products]
                    : [];


            /* BRAND FILTER */

            if (
                currentBrandFilter &&
                currentBrandFilter !== 'all'
            ) {

                filtered =
                    filtered.filter(function(product) {

                        return (
                            product.brand &&
                            String(product.brand)
                                .toLowerCase() ===
                            String(currentBrandFilter)
                                .toLowerCase()
                        );

                    });

            }


            /* CATEGORY FILTER */

            if (
                currentCategoryFilter &&
                currentCategoryFilter !== 'all'
            ) {

                const selectedCategory =
                    String(currentCategoryFilter || '').toLowerCase();

                filtered = filtered.filter(function(product) {
                    return String(product.category || '').trim().toLowerCase() === selectedCategory;
                });

            }

            
            /* SEARCH */

            if (searchQuery) {

                filtered =
                    filtered.filter(function(product) {

                        return productMatchesSearch(
                            product,
                            searchQuery
                        );

                    });

            }


            return filtered;

        }


        /* =========================================================
           RENDER PRODUCTS
           ========================================================= */

        function renderProducts(list) {

            const productGrid =
                document.getElementById('productGrid');

            const noProducts =
                document.getElementById('noProducts');

            const productCount =
                document.getElementById('productCount');


            if (!productGrid) {
                return;
            }


            const finalList =
                Array.isArray(list)
                    ? list
                    : getFilteredProducts();


            currentSortedProducts =
                [...finalList];


            productGrid.innerHTML = '';


            if (productCount) {

                productCount.textContent =
                    `${finalList.length} ${
                        finalList.length === 1
                            ? 'Product'
                            : 'Products'
                    }`;

            }


            if (finalList.length === 0) {

                productGrid.classList.add('hidden');

                if (noProducts) {
                    noProducts.classList.remove('hidden');
                }

                return;

            }


            productGrid.classList.remove('hidden');

            if (noProducts) {
                noProducts.classList.add('hidden');
            }


            finalList.forEach(function(product) {

                productGrid.insertAdjacentHTML(
                    'beforeend',
                    createProductCard(product)
                );

            });

        }


        /* =========================================================
           PRODUCT CARD
           ========================================================= */

        function createProductCard(product) {

            const image =
                getProductImage(product);

            const category =
                product.category || 'General';

            const categoryIcon =
                getCategoryIcon(category);

            const categoryColor =
                getCategoryColor(category);

            const specs =
                product.specs || {};

            const specEntries =
                Object.entries(specs).slice(0, 3);


            let specsHtml = '';


            if (specEntries.length > 0) {

                specsHtml = `
                    <div class="product-spec-list">
                `;

                specEntries.forEach(function(entry) {

                    const key = entry[0];
                    const value = entry[1];

                    specsHtml += `
                        <div class="product-spec-item">

                            <span class="product-spec-key">
                                ${escapeHtml(key)}
                            </span>

                            <span class="product-spec-value">
                                ${escapeHtml(value)}
                            </span>

                        </div>
                    `;

                });

                specsHtml += `
                    </div>
                `;

            }


            return `
                <article
                    class="product-card fade-in"
                    data-product-id="${escapeHtml(product.id)}"
                    onclick="openProductModal(${Number(product.id)})">


                    <!-- IMAGE -->

                    <div class="product-image-area">

                        ${
                            image
                                ? `
                                    <img decoding="async"
                                        src="${escapeHtml(image)}"
                                        alt="${escapeHtml(product.name)}"
                                        loading="lazy"
                                        onerror="handleProductImageError(this)"
                                    >
                                  `
                                : `
                                    <div class="w-full h-full flex items-center
                                                justify-center bg-slate-100">

                                        <div class="text-center">

                                            <i class="fa-solid
                                                      ${categoryIcon}
                                                      text-4xl text-slate-300"></i>

                                            <div class="mt-2 text-[10px]
                                                        text-slate-400">
                                                Product Image
                                            </div>

                                        </div>

                                    </div>
                                  `
                        }


                        <div class="product-badge">

                            <i class="fa-solid
                                      ${categoryIcon}
                                      mr-1.5"></i>

                            ${escapeHtml(category)}

                        </div>


                        <div class="product-category-badge
                                    ${categoryColor}">

                            ${escapeHtml(
                                product.brand
                                    ? product.brand
                                    : 'Solution'
                            )}

                        </div>


                        ${getStockBadge(product)}


                        <div class="product-image-overlay">

                            <div class="product-view-button">

                                <i class="fa-solid fa-eye mr-1.5"></i>

                                View Product Details

                            </div>

                        </div>

                    </div>


                    <!-- CONTENT -->

                    <div class="product-content">

                        <div class="flex flex-wrap gap-1.5">

                            ${getBrandBadge(product)}

                            ${getSupplierBadge(product)}

                        </div>


                        ${
                            product.sku
                                ? `
                                    <div class="product-sku">
                                        SKU:
                                        ${escapeHtml(product.sku)}
                                    </div>
                                  `
                                : ''
                        }


                        <button
                            type="button"
                            class="product-title"
                            onclick="openProductModal(${Number(product.id)}); event.stopPropagation();">

                            ${escapeHtml(product.name)}

                        </button>


                        <div class="product-description">

                            ${escapeHtml(
                                product.description ||
                                'Technical solution available from Dynamic Technology Solutions.'
                            )}

                        </div>


                        ${specsHtml}


                        <div class="mt-5 pt-4 border-t border-slate-100
                                    flex items-end justify-between gap-3">

                            <div>

                                <div class="amazon-price">

                                    ${escapeHtml(
                                        product.price ||
                                        'Get Quote'
                                    )}

                                </div>

                                <div class="amazon-subtext">

                                    ${
                                        product.priceValue &&
                                        Number(product.priceValue) > 0
                                            ? 'Product price'
                                            : 'Contact us for pricing'
                                    }

                                </div>

                            </div>


                            <button
                                type="button"
                                class="amazon-button"
                                onclick="openProductModal(${Number(product.id)}); event.stopPropagation();">

                                Details

                                <i class="fa-solid fa-arrow-right"></i>

                            </button>

                        </div>

                    </div>

                </article>
            `;

        }


        /* =========================================================
           IMAGE ERROR HANDLER
           ========================================================= */

        function handleProductImageError(imageElement) {

            if (!imageElement) {
                return;
            }

            imageElement.onerror = null;

            imageElement.style.display = 'none';

            const parent =
                imageElement.parentElement;

            if (parent) {

                const fallback =
                    document.createElement('div');

                fallback.className =
                    'absolute inset-0 flex items-center justify-center bg-slate-100';

                fallback.innerHTML = `
                    <div class="text-center">
                        <i class="fa-solid fa-image
                                  text-4xl text-slate-300"></i>

                        <div class="mt-2 text-[10px]
                                    text-slate-400">
                            Image unavailable
                        </div>
                    </div>
                `;

                parent.appendChild(fallback);

            }

        }


        /* =========================================================
           BRAND FILTER
           ========================================================= */

                function setBrandFilter(brand) {

            currentBrandFilter = brand || 'all';

            // A brand selection should not be hidden by an old search/category filter.
            currentCategoryFilter = 'all';
            searchQuery = '';

            const searchInput = document.getElementById('productSearch');
            if (searchInput) searchInput.value = '';

            const searchClear = document.getElementById('searchClear');
            if (searchClear) searchClear.style.display = 'none';

            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                searchResults.style.display = 'none';
                searchResults.innerHTML = '';
            }

            document.querySelectorAll('.brand-button').forEach(function(button) {
                button.classList.remove('active');
            });

            document.querySelectorAll('.category-button').forEach(function(button) {
                button.classList.remove('active');
            });

            const categoryAll = document.getElementById('categoryAll');
            if (categoryAll) categoryAll.classList.add('active');

            const brandIds = {
                all: 'brandAll',
                Prizor: 'brandPrizor',
                HOC: 'brandHOC',
                Metrac: 'brandMetrac'
            };
            const selectedButton = document.getElementById(brandIds[currentBrandFilter] || '');
            if (selectedButton) selectedButton.classList.add('active');

            renderProducts(getFilteredProducts());
        }

        /* =========================================================
           CATEGORY FILTER
           ========================================================= */

        function setCategoryFilter(category) {

            currentCategoryFilter =
                category || 'all';


            document.querySelectorAll(
                '.category-button'
            ).forEach(function(button) {

                button.classList.remove('active');

            });


            const categoryMap = {

                'all':
                    'categoryAll',

                'CCTV & Surveillance':
                    'categoryCCTV',

                'IT Infrastructure':
                    'categoryIT',

                'Networking':
                    'categoryNetworking',

                'Electrical':
                    'categoryElectrical',

                'Fire Safety & Services':
                    'categoryFire',

                'Access Control':
                    'categoryAccess',

                'Services':
                    'categoryServices'

            };


            const buttonId =
                categoryMap[currentCategoryFilter];


            if (buttonId) {

                const button =
                    document.getElementById(
                        buttonId
                    );

                if (button) {
                    button.classList.add('active');
                }

            }


            renderProducts(
                getFilteredProducts()
            );


            const catalogue =
                document.getElementById(
                    'catalogue'
                );

            if (catalogue) {

                catalogue.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

            }

        }


        /* =========================================================
           RESET FILTERS
           ========================================================= */

        function resetAllFilters() {

            currentBrandFilter = 'all';
            currentCategoryFilter = 'all';
            searchQuery = '';


            const searchInput =
                document.getElementById(
                    'productSearch'
                );

            if (searchInput) {
                searchInput.value = '';
            }


            const searchClear =
                document.getElementById(
                    'searchClear'
                );

            if (searchClear) {
                searchClear.style.display = 'none';
            }


            const searchResults =
                document.getElementById(
                    'searchResults'
                );

            if (searchResults) {
                searchResults.style.display = 'none';
                searchResults.innerHTML = '';
            }


            document.querySelectorAll(
                '.brand-button'
            ).forEach(function(button) {

                button.classList.remove('active');

            });


            document.querySelectorAll(
                '.category-button'
            ).forEach(function(button) {

                button.classList.remove('active');

            });


            const brandAll =
                document.getElementById(
                    'brandAll'
                );

            if (brandAll) {
                brandAll.classList.add('active');
            }


            const categoryAll =
                document.getElementById(
                    'categoryAll'
                );

            if (categoryAll) {
                categoryAll.classList.add('active');
            }


            renderProducts(
                getFilteredProducts()
            );

        }


        /* =========================================================
           SEARCH INPUT
           ========================================================= */

        function handleSearchInput(value) {

            searchQuery =
                String(value || '')
                    .trim()
                    .toLowerCase();


            const clearButton =
                document.getElementById(
                    'searchClear'
                );


            if (clearButton) {

                clearButton.style.display =
                    searchQuery
                        ? 'block'
                        : 'none';

            }


            renderProducts(
                getFilteredProducts()
            );


            showSearchSuggestions(
                searchQuery
            );

        }


        /* =========================================================
           CLEAR SEARCH
           ========================================================= */

        function clearSearch() {

            const input =
                document.getElementById(
                    'productSearch'
                );

            if (input) {
                input.value = '';
                input.focus();
            }

            searchQuery = '';


            const clearButton =
                document.getElementById(
                    'searchClear'
                );

            if (clearButton) {
                clearButton.style.display = 'none';
            }


            const searchResults =
                document.getElementById(
                    'searchResults'
                );

            if (searchResults) {

                searchResults.style.display =
                    'none';

                searchResults.innerHTML =
                    '';

            }


            renderProducts(
                getFilteredProducts()
            );

        }


        /* =========================================================
           SEARCH SUGGESTIONS
           ========================================================= */

        function showSearchSuggestions(query) {

            const resultsBox =
                document.getElementById(
                    'searchResults'
                );


            if (!resultsBox) {
                return;
            }


            if (!query) {

                resultsBox.style.display =
                    'none';

                resultsBox.innerHTML =
                    '';

                return;

            }


            const matches =
                products
                    .filter(function(product) {

                        return productMatchesSearch(
                            product,
                            query
                        );

                    })
                    .slice(0, 7);


            if (matches.length === 0) {

                resultsBox.innerHTML = `
                    <div class="px-4 py-4 text-xs text-slate-500">
                        No matching product or service found.
                    </div>
                `;

                resultsBox.style.display =
                    'block';

                return;

            }


            resultsBox.innerHTML =
                matches.map(function(product) {

                    const image =
                        getProductImage(product);

                    return `
                        <button
                            type="button"
                            class="search-result-item"
                            onclick="selectSearchResult(${Number(product.id)})">

                            ${
                                image
                                    ? `
                                        <img
                                            src="${escapeHtml(image)}"
                                            alt="${escapeHtml(product.name)}"
                                            loading="lazy" decoding="async"
                                            class="search-result-image"
                                            onerror="this.style.display='none'"
                                        >
                                      `
                                    : `
                                        <div class="search-result-image
                                                    flex items-center justify-center">
                                            <i class="fa-solid fa-box
                                                      text-slate-300"></i>
                                        </div>
                                      `
                            }

                            <div class="min-w-0">

                                <div class="search-result-title">
                                    ${escapeHtml(product.name)}
                                </div>

                                <div class="search-result-meta">
                                    ${escapeHtml(
                                        product.brand ||
                                        product.category ||
                                        'DTS Solution'
                                    )}
                                </div>

                            </div>

                        </button>
                    `;

                }).join('');


            resultsBox.style.display =
                'block';

        }


        /* =========================================================
           SELECT SEARCH RESULT
           ========================================================= */

        function selectSearchResult(productId) {

            const product =
                products.find(function(item) {

                    return Number(item.id) ===
                           Number(productId);

                });


            const resultsBox =
                document.getElementById(
                    'searchResults'
                );

            if (resultsBox) {

                resultsBox.style.display =
                    'none';

            }


            if (product) {

                openProductModal(
                    product.id
                );

            }

        }


        /* =========================================================
           CLICK OUTSIDE SEARCH
           ========================================================= */

        document.addEventListener(
            'click',
            function(event) {

                const searchBox =
                    document.querySelector(
                        '.search-box'
                    );

                const resultsBox =
                    document.getElementById(
                        'searchResults'
                    );


                if (
                    searchBox &&
                    resultsBox &&
                    !searchBox.contains(event.target)
                ) {

                    resultsBox.style.display =
                        'none';

                }

            }
        );


        /* =========================================================
           MOBILE MENU
           ========================================================= */

        function toggleMobileMenu() {

            const menu =
                document.getElementById(
                    'mobileMenu'
                );

            const icon =
                document.getElementById(
                    'mobileMenuIcon'
                );


            if (!menu) {
                return;
            }


            const isOpen =
                menu.style.display === 'block';


            if (isOpen) {

                menu.style.display =
                    'none';

                if (icon) {
                    icon.className =
                        'fa-solid fa-bars';
                }

            }
            else {

                menu.style.display =
                    'block';
                if (icon) {
                    icon.className =
                        'fa-solid fa-xmark';
                }

            }

        }


        function closeMobileMenu() {

            const menu =
                document.getElementById(
                    'mobileMenu'
                );

            const icon =
                document.getElementById(
                    'mobileMenuIcon'
                );


            if (menu) {
                menu.style.display = 'none';
            }


            if (icon) {
                icon.className =
                    'fa-solid fa-bars';
            }

        }


        /* =========================================================
           PRODUCT MODAL
           ========================================================= */

        function openProductModal(productId) {

            const product =
                products.find(function(item) {

                    return Number(item.id) ===
                           Number(productId);

                });


            if (!product) {

                console.warn(
                    'Product not found:',
                    productId
                );

                return;

            }


            activeModalProduct =
                product;


            currentModalImages =
                getProductImages(product);


            if (
                currentModalImages.length === 0
            ) {

                currentModalImages =
                    [''];

            }


            currentModalImageIndex =
                0;


            updateProductModal();


            const modal =
                document.getElementById(
                    'productModal'
                );


            if (modal) {

                modal.classList.remove(
                    'hidden'
                );

                document.body.classList.add(
                    'modal-open'
                );

            }

        }


        /* =========================================================
           UPDATE PRODUCT MODAL
           ========================================================= */

        function updateProductModal() {

            const product =
                activeModalProduct;


            if (!product) {
                return;
            }


            const mainImage =
                document.getElementById(
                    'modalProductImage'
                );

            const name =
                document.getElementById(
                    'modalProductName'
                );

            const brand =
                document.getElementById(
                    'modalProductBrand'
                );

            const category =
                document.getElementById(
                    'modalProductCategory'
                );

            const description =
                document.getElementById(
                    'modalProductDescription'
                );

            const price =
                document.getElementById(
                    'modalProductPrice'
                );

            const stock =
                document.getElementById(
                    'modalProductStock'
                );

            const sku =
                document.getElementById(
                    'modalProductSKU'
                );

            const supplier =
                document.getElementById(
                    'modalProductSupplier'
                );

            const availability =
                document.getElementById(
                    'modalProductAvailability'
                );

            const about =


                document.getElementById(


                    'modalProductAbout'


                );



            const specs =


                document.getElementById(


                    'modalProductSpecs'


                );


            /* MAIN IMAGE */

            const activeImage =
                currentModalImages[
                    currentModalImageIndex
                ] || '';


            if (mainImage) {

                mainImage.src =
                    activeImage;

                mainImage.alt =
                    product.name || 'Product image';

                mainImage.onerror =
                    function() {

                        this.onerror = null;

                        this.src =
                            'data:image/svg+xml;charset=UTF-8,' +
                            encodeURIComponent(`
                                <svg xmlns="http://www.w3.org/2000/svg"
                                     width="800"
                                     height="600"
                                     viewBox="0 0 800 600">

                                    <rect width="800"
                                          height="600"
                                          fill="#f1f5f9"/>

                                    <text x="400"
                                          y="285"
                                          text-anchor="middle"
                                          font-family="Arial"
                                          font-size="32"
                                          fill="#94a3b8">
                                        Product Image
                                    </text>

                                    <text x="400"
                                          y="330"
                                          text-anchor="middle"
                                          font-family="Arial"
                                          font-size="20"
                                          fill="#cbd5e1">
                                        ${escapeHtml(product.name)}
                                    </text>

                                </svg>
                            `);

                    };

            }


            /* NAME */

            if (name) {

                name.textContent =
                    product.name || '';

            }


            /* BRAND */

            if (brand) {

                if (
                    product.brand &&
                    String(product.brand).trim()
                ) {

                    brand.innerHTML = `
                        <i class="fa-solid fa-tag mr-1"></i>
                        ${escapeHtml(product.brand)}
                    `;

                    brand.classList.remove(
                        'hidden'
                    );

                }
                else {

                    brand.classList.add(
                        'hidden'
                    );

                }

            }


            /* CATEGORY */

            if (category) {

                category.innerHTML = `
                    <i class="fa-solid
                              ${getCategoryIcon(product.category)}
                              mr-1"></i>

                    ${escapeHtml(
                        product.category ||
                        'General'
                    )}
                `;

            }


            /* STOCK */

            if (stock) {

                stock.innerHTML = `
                    <i class="fa-solid fa-circle-check mr-1"></i>
                    ${escapeHtml(
                        product.stock ||
                        'On Request'
                    )}
                `;

            }


            /* SKU */

            if (sku) {

                sku.textContent =
                    product.sku
                        ? `SKU: ${product.sku}`
                        : '';

            }


            /* SUPPLIER */

            if (supplier) {

                if (
                    !product.brand ||
                    String(product.brand).trim() === ''
                ) {

                    supplier.innerHTML = `
                        <div class="supplier-badge">
                            <i class="fa-solid fa-building"></i>
                            Supplied & Installed by
                            Dynamic Technology Solutions
                        </div>
                    `;

                }
                else {

                    supplier.innerHTML = `
                        <div class="text-[11px] text-slate-500">
                            Product supplied and supported by
                            Dynamic Technology Solutions.
                        </div>
                    `;

                }

            }


            /* DESCRIPTION */

            if (description) {

                const descriptionText =
                    product.description ||
                    'Technical solution supplied and supported by Dynamic Technology Solutions.';

                description.innerHTML =
                    escapeHtml(descriptionText) +
                    '';

            }
            /* ABOUT THIS ITEM */

            if (about) {

                const aboutItems = [];

                if (product.description) {
                    aboutItems.push(product.description);
                }

                Object.entries(product.specs || {})
                    .forEach(function(entry) {

                        if (
                            entry[0] &&
                            entry[1] &&
                            String(entry[0]).toLowerCase() !== 'brand'
                        ) {
                            aboutItems.push(
                                String(entry[0]) + ': ' + String(entry[1])
                            );
                        }

                    });

                const uniqueAboutItems = aboutItems
                    .filter(function(item, index, array) {
                        return item &&
                               array.indexOf(item) === index;
                    })
                    .slice(0, 6);

                about.innerHTML =
                    uniqueAboutItems.length
                        ? uniqueAboutItems.map(function(item) {
                            return '<div class="flex items-start gap-2">' +
                                   '<span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-slate-900 flex-shrink-0"></span>' +
                                   '<span>' + escapeHtml(item) + '</span>' +
                                   '</div>';
                        }).join('')
                        : '<div class="text-[13px] text-slate-500">' +
                          'Product details available on enquiry.' +
                          '</div>';

            }




            /* PRICE */

            if (price) {

                price.textContent =
                    product.price ||
                    'Get Quote';

            }


            /* AVAILABILITY */

            if (availability) {

                availability.textContent =
                    product.stock ||
                    'On Request';

            }


            /* SPECIFICATIONS */

            if (specs) {

                specs.innerHTML =
                    createModalSpecs(product);

            }


            /* THUMBNAILS */

            renderModalThumbnails();

        }


        /* =========================================================
           MODAL SPECIFICATION TABLE
           ========================================================= */

        function createModalSpecs(product) {

            const specEntries =
                Object.entries(
                    product.specs || {}
                );


            if (specEntries.length === 0) {

                return `
                    <div class="rounded-xl bg-slate-50
                                border border-slate-200
                                p-4 text-xs text-slate-500">

                        Detailed specifications available
                        on enquiry.

                    </div>
                `;

            }

            return `
                <table class="modal-spec-table">
                    <tbody>

                        ${specEntries.map(function(entry) {

                            return `
                                <tr>

                                    <td>
                                        ${escapeHtml(entry[0])}
                                    </td>

                                    <td>
                                        ${escapeHtml(entry[1])}
                                    </td>

                                </tr>
                            `;

                        }).join('')}

                    </tbody>
                </table>
            `;

        }


        /* =========================================================
           RENDER MODAL THUMBNAILS
           ========================================================= */

        function renderModalThumbnails() {

            const gallery =
                document.getElementById(
                    'modalThumbnailGallery'
                );


            if (!gallery) {
                return;
            }


            gallery.innerHTML = '';


            if (
                !Array.isArray(currentModalImages) ||
                currentModalImages.length === 0
            ) {

                return;

            }


            currentModalImages.forEach(
                function(image, index) {

                    const button =
                        document.createElement(
                            'button'
                        );

                    button.type =
                        'button';

                    button.className =
                        'thumbnail-button' +
                        (
                            index ===
                            currentModalImageIndex
                                ? ' active'
                                : ''
                        );

                    button.setAttribute(
                        'aria-label',
                        `View image ${index + 1}`
                    );


                    const img =
                        document.createElement(
                            'img'
                        );

                    img.src =
                        image;

                    img.alt =
                        activeModalProduct
                            ? activeModalProduct.name
                            : 'Product image';


                    img.onerror =
                        function() {

                            this.style.opacity =
                                '0.35';

                        };


                    button.appendChild(
                        img
                    );


                    button.addEventListener(
                        'click',
                        function(event) {

                            event.preventDefault();
                            event.stopPropagation();

                            currentModalImageIndex =
                                index;

                            updateProductModal();

                        }
                    );


                    gallery.appendChild(
                        button
                    );

                }
            );

        }


        /* =========================================================
           NEXT PRODUCT IMAGE
           ========================================================= */

        function nextProductImage(event) {

            if (event) {

                event.preventDefault();
                event.stopPropagation();

            }


            if (
                !currentModalImages ||
                currentModalImages.length <= 1
            ) {

                return;

            }


            currentModalImageIndex =
                (
                    currentModalImageIndex + 1
                ) %
                currentModalImages.length;


            updateProductModal();

        }


        /* =========================================================
           PREVIOUS PRODUCT IMAGE
           ========================================================= */

        function previousProductImage(event) {

            if (event) {

                event.preventDefault();
                event.stopPropagation();

            }


            if (
                !currentModalImages ||
                currentModalImages.length <= 1
            ) {

                return;

            }


            currentModalImageIndex =
                (
                    currentModalImageIndex -
                    1 +
                    currentModalImages.length
                ) %
                currentModalImages.length;


            updateProductModal();

        }


        /* =========================================================
           CLOSE PRODUCT MODAL
           ========================================================= */

        function closeProductModal() {

            const modal =
                document.getElementById(
                    'productModal'
                );


            if (modal) {

                modal.classList.add(
                    'hidden'
                );

            }


            document.body.classList.remove(
                'modal-open'
            );


            activeModalProduct =
                null;

            currentModalImages =
                [];

            currentModalImageIndex =
                0;

        }


        /* =========================================================
           PRODUCT MODAL BACKDROP
           ========================================================= */

        function handleProductModalBackdrop(event) {

            if (
                event.target &&
                event.target.id ===
                'productModal'
            ) {

                closeProductModal();

            }

        }


        /* =========================================================
           WHATSAPP PRODUCT ENQUIRY
           ========================================================= */

        function enquireCurrentProduct() {

            if (!activeModalProduct) {
                return;
            }


            const product =
                activeModalProduct;


            const brandText =
                product.brand
                    ? `Brand: ${product.brand}\n`
                    : '';


            const message =
                `Hello Dynamic Technology Solutions,

I am interested in the following product/service:

Product: ${product.name}
${brandText}Category: ${product.category || 'General'}
SKU: ${product.sku || 'N/A'}

Please share:
• Price / quotation
• Availability
• Technical specifications
• Installation details

Thank you.`;


            const url =
                'https://wa.me/918390909845?text=' +
                encodeURIComponent(message);


            window.open(
                url,
                '_blank',
                'noopener,noreferrer'
            );

        }


        /* =========================================================
           SITE VISIT REQUEST
           ========================================================= */

        function requestSiteVisit() {

            const productName =
                activeModalProduct
                    ? activeModalProduct.name
                    : 'Technical Requirement';


            const message =
                `Hello Dynamic Technology Solutions,

I would like to request a site visit regarding:

${productName}

Please contact me to discuss the requirement and suitable site-visit timing.

Thank you.`;


            const url =
                'https://wa.me/918390909845?text=' +
                encodeURIComponent(message);


            window.open(
                url,
                '_blank',
                'noopener,noreferrer'
            );

        }


        /* =========================================================
           KEYBOARD SUPPORT
           ========================================================= */

        document.addEventListener(
            'keydown',
            function(event) {

                if (event.key === 'Escape') {

                    const productModal =
                        document.getElementById(
                            'productModal'
                        );

                    const aiModal =
                        document.getElementById(
                            'aiModal'
                        );


                    if (
                        productModal &&
                        !productModal.classList.contains(
                            'hidden'
                        )
                    ) {

                        closeProductModal();

                    }


                    if (
                        aiModal &&
                        !aiModal.classList.contains(
                            'hidden'
                        )
                    ) {

                        closeAIAssistant();

                    }

                }


                if (
                    activeModalProduct &&
                    event.key === 'ArrowRight'
                ) {

                    nextProductImage();

                }


                if (
                    activeModalProduct &&
                    event.key === 'ArrowLeft'
                ) {

                    previousProductImage();

                }

            }
        );


        /* =========================================================
           INITIAL PAGE SETUP
           ========================================================= */

        async function hydrateOfficialProductImages() {
            const catalogueProducts = products.filter(function(product) {
                return product && product.officialUrl;
            });
            if (!catalogueProducts.length) return;
            try {
                const response = await fetch(
                    'https://dts-tech-solutions.onrender.com/api/product-images',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            urls: catalogueProducts.map(function(product) {
                                return product.officialUrl;
                            })
                        })
                    }
                );
                if (!response.ok) return;
                const data = await response.json();
                const imageMap = data && data.images ? data.images : {};
                catalogueProducts.forEach(function(product) {
                    const images = imageMap[product.officialUrl];
                    if (Array.isArray(images) && images.length) {
                        product.image = images[0];
                        product.thumbnails = images;
                    }
                });
                renderProducts(getFilteredProducts());
            } catch (error) {
                console.warn('Official product image hydration failed:', error);
            }
        }


        function initializeCatalogue() {

            if (
                typeof products === 'undefined' ||
                !Array.isArray(products)
            ) {
                console.error('Product catalogue data is not available.');
                return;
            }

            currentSortedProducts = [...products];

            try {
                renderProducts(products);
            } catch (error) {
                console.error('Main product renderer failed. Using safe catalogue renderer:', error);

                const grid = document.getElementById('productGrid');
                const count = document.getElementById('productCount');
                const empty = document.getElementById('noProducts');

                if (!grid) return;

                grid.innerHTML = '';

                products.forEach(function(product) {
                    if (!product) return;

                    const id = Number(product.id);
                    const name = escapeHtml(product.name || 'DTS Product');
                    const category = escapeHtml(product.category || 'Solution');
                    const image = product.image || (
                        Array.isArray(product.thumbnails) &&
                        product.thumbnails.length
                            ? product.thumbnails[0]
                            : ''
                    );
                    const price = escapeHtml(product.price || 'Get Quote');

                    const card = document.createElement('article');
                    card.className = 'product-card fade-in';
                    card.setAttribute('data-product-id', String(id));

                    card.innerHTML = `
                        <div class="product-image-area">
                            ${image
                                ? '<img decoding="async" src="' + escapeHtml(image) + '" alt="' + name + '" loading="lazy" onerror="this.style.display=\'none\'">'
                                : '<div class="w-full h-full flex items-center justify-center bg-slate-100"><i class="fa-solid fa-box text-4xl text-slate-300"></i></div>'
                            }
                            <div class="product-badge">${category}</div>
                        </div>
                        <div class="product-content">
                            <div class="product-title">${name}</div>
                            <div class="product-description">${category}</div>
                            <div class="mt-5 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
                                <div class="amazon-price">${price}</div>
                                <button type="button" class="amazon-button">Details <i class="fa-solid fa-arrow-right"></i></button>
                            </div>
                        </div>
                    `;

                    card.addEventListener('click', function() {
                        if (typeof openProductModal === 'function') {
                            openProductModal(id);
                        }
                    });

                    grid.appendChild(card);
                });

                if (count) {
                    count.textContent = products.length + (products.length === 1 ? ' Product' : ' Products');
                }

                grid.classList.remove('hidden');

                if (empty) {
                    empty.classList.add('hidden');
                }
            }
        }


        // Moving/lunar festival dates are loaded from live calendar feeds below.
        // Do not hard-code a single year's tithi dates: they become stale next year.
        const DTS_FESTIVAL_CALENDAR = {};

        const DTS_FIXED_FESTIVALS = {
            '01-01': { name: 'New Year', greeting: 'Naye saal ki hardik shubhkamnayein! 🎉', theme: 'generic', symbols: ['🎉', '✨'] },
            '01-26': { name: 'Republic Day', greeting: 'Republic Day ki hardik shubhkamnayein! 🇮🇳', theme: 'tricolor', symbols: ['🇮🇳', '✨'] },
            '08-15': { name: 'Independence Day', greeting: 'Swatantrata Diwas ki hardik shubhkamnayein! 🇮🇳', theme: 'tricolor', symbols: ['🇮🇳', '✨'] },
            '10-02': { name: 'Gandhi Jayanti', greeting: 'Gandhi Jayanti ki shubhkamnayein. 🙏', theme: 'generic', symbols: ['🙏', '🌼'] },
            '12-25': { name: 'Christmas', greeting: 'Christmas ki hardik shubhkamnayein! 🎄', theme: 'christmas', symbols: ['🎄', '✨'] }
        };

        function getDTSFestival(now) {
            const monthDay = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            const yearMonthDay = now.getFullYear() + '-' + monthDay;
            return DTS_FESTIVAL_CALENDAR[yearMonthDay] || DTS_FIXED_FESTIVALS[monthDay] || null;
        }

        function applyDTSFestivalAnimation(festival) {
            const existing = document.getElementById('dtsFestivalAnimation');
            const festivalVideo = document.getElementById('dtsFestivalBackdrop');
            if (existing && existing.dataset.festivalName === (festival && festival.name)) return;

            // Keep the video element alive when a festival ends or changes so it
            // can be reused for the next festival instead of being deleted with
            // the old overlay.
            if (existing && festivalVideo && existing.contains(festivalVideo)) {
                document.body.appendChild(festivalVideo);
                festivalVideo.pause();
            }
            if (!festival) {
                if (existing) existing.remove();
                return;
            }
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'dtsFestivalAnimation';
            overlay.className = 'dts-festival-animation dts-festival-' + (festival.theme || 'generic');
            overlay.dataset.festivalName = festival.name;
            overlay.setAttribute('aria-hidden', 'true');

            const scene = document.createElement('div');
            scene.className = 'dts-festival-scene';
            if (festivalVideo) {
                scene.appendChild(festivalVideo);
                festivalVideo.preload = 'auto';
                const playAttempt = festivalVideo.play();
                if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(() => {});
            }
            const fireworks = document.createElement('div');
            fireworks.className = 'dts-festival-fireworks';
            const fireworkColors = festival.theme === 'holi' ? ['#f472b6', '#38bdf8', '#facc15', '#a78bfa'] : festival.theme === 'tricolor' ? ['#fb923c', '#f8fafc', '#4ade80'] : ['#ffd166', '#fb923c', '#f9a8d4', '#67e8f9'];
            for (let i = 0; i < 7; i++) {
                const burst = document.createElement('span');
                burst.className = 'dts-festival-firework';
                burst.style.setProperty('--fw-x', (12 + ((i * 29) % 78)) + '%');
                burst.style.setProperty('--fw-y', (13 + ((i * 17) % 37)) + '%');
                burst.style.setProperty('--fw-color', fireworkColors[i % fireworkColors.length]);
                burst.style.setProperty('--fw-delay', (-i * 0.53) + 's');
                fireworks.appendChild(burst);
            }
            const horizon = document.createElement('div');
            horizon.className = 'dts-festival-horizon';
            const diyaRow = document.createElement('div');
            diyaRow.className = 'dts-festival-diya-row';
            if (['diwali', 'ganesh', 'generic', 'dussehra'].includes(festival.theme)) {
                for (let i = 0; i < 9; i++) {
                    const diya = document.createElement('span');
                    diya.className = 'dts-festival-diya';
                    diya.style.animationDelay = (-i * 0.16) + 's';
                    diyaRow.appendChild(diya);
                }
            }
            scene.appendChild(fireworks);
            scene.appendChild(horizon);
            scene.appendChild(diyaRow);
            overlay.appendChild(scene);

            const garland = document.createElement('div');
            garland.className = 'dts-festival-garland';
            for (let i = 0; i < 32; i++) {
                const bulb = document.createElement('span');
                bulb.className = 'dts-festival-bulb';
                bulb.style.left = ((i / 31) * 100) + '%';
                bulb.style.animationDelay = ((i % 8) * -0.19) + 's';
                garland.appendChild(bulb);
            }

            const left = document.createElement('div');
            left.className = 'dts-festival-corner dts-festival-corner-left';
            left.textContent = (festival.symbols && festival.symbols[0]) || '✨';
            const right = document.createElement('div');
            right.className = 'dts-festival-corner dts-festival-corner-right';
            right.textContent = (festival.symbols && festival.symbols[1]) || '🌼';

            const banner = document.createElement('div');
            banner.className = 'dts-festival-banner';
            const bannerTitle = document.createElement('div');
            bannerTitle.className = 'dts-festival-banner-title';
            bannerTitle.textContent = festival.name === 'Vijayadashami / Dussehra'
                ? '🏹 विजयादशमी की हार्दिक शुभकामनाएँ 🪔'
                : (festival.greeting || (festival.name + ' ki hardik shubhkamnayein!'));
            const bannerSubtitle = document.createElement('div');
            bannerSubtitle.className = 'dts-festival-banner-subtitle';
            bannerSubtitle.textContent = 'Dynamic Technology Solutions • Khushiyon aur tarakki ka tyohar';
            banner.appendChild(bannerTitle);
            banner.appendChild(bannerSubtitle);

            const petals = document.createElement('div');
            petals.className = 'dts-festival-dots';
            const symbols = festival.theme === 'diwali' ? ['🪔', '✨', '🌼'] :
                festival.theme === 'holi' ? ['🌈', '🌸', '🎨'] :
                festival.theme === 'christmas' ? ['❄️', '🎄', '✨'] :
                festival.theme === 'tricolor' ? ['🇮🇳', '✨', '🌼'] :
                ['🌼', '🌸', '✨', '🪔'];
            for (let i = 0; i < 24; i++) {
                const petal = document.createElement('span');
                petal.className = 'dts-festival-petal';
                petal.textContent = symbols[i % symbols.length];
                petal.style.setProperty('--petal-left', (2 + ((i * 37) % 96)) + '%');
                petal.style.setProperty('--petal-size', (16 + (i % 3) * 5) + 'px');
                petal.style.setProperty('--petal-duration', (5.5 + (i % 5) * 0.7) + 's');
                petal.style.setProperty('--petal-delay', (-((i % 12) * 0.65)) + 's');
                petals.appendChild(petal);
            }

            const dots = document.createElement('div');
            dots.className = 'dts-festival-dots';
            for (let i = 0; i < 14; i++) {
                const dot = document.createElement('span');
                dot.className = 'dts-festival-dot';
                dot.style.left = (4 + i * 7) + '%';
                dot.style.animationDelay = ((i % 7) * -0.4) + 's';
                dots.appendChild(dot);
            }

            overlay.appendChild(garland);
            overlay.appendChild(left);
            overlay.appendChild(right);
            overlay.appendChild(banner);
            overlay.appendChild(petals);
            overlay.appendChild(dots);
            document.body.appendChild(overlay);
        }

        function festivalFromHolidayName(holiday) {
            const name = String((holiday && (holiday.name || holiday.localName)) || '');
            const lower = holiday
                ? [holiday.name, holiday.localName, holiday.nameEn, holiday.nameHi]
                    .filter(Boolean).join(' ').toLowerCase()
                : '';
            const mappings = [
                { match: /diwali|deepavali|deepawali/, name: 'Diwali', greeting: 'Deepawali ki hardik shubhkamnayein! Aapke ghar aur business mein khushiyaan aur samriddhi aaye. 🪔', theme: 'diwali', symbols: ['🪔', '✨'] },
                { match: /dussehra|vijaya dashami|vijayadashami|dasara/, name: 'Dussehra', greeting: 'Vijayadashami aur Dussehra ki hardik shubhkamnayein! 🙏', theme: 'dussehra', symbols: ['🌼', '✨'] },
                { match: /dhanteras|dhan trayodashi/, name: 'Dhanteras', greeting: 'Dhanteras ki hardik shubhkamnayein! 🪔', theme: 'diwali', symbols: ['🪔', '✨'] },
                { match: /bhai dooj|bhau beej|bhai tika/, name: 'Bhai Dooj', greeting: 'Bhai Dooj ki hardik shubhkamnayein! 🌼', theme: 'generic', symbols: ['🌼', '✨'] },
                { match: /holika dahan|holi/, name: 'Holi', greeting: 'Holi ki dher saari shubhkamnayein! 🌈', theme: 'holi', symbols: ['🌈', '🎨'] },
                { match: /ganesh chaturthi|vinayaka chaturthi|ganeshotsav/, name: 'Ganesh Chaturthi', greeting: 'Ganesh Chaturthi ki hardik shubhkamnayein! 🙏', theme: 'ganesh', symbols: ['🙏', '🌼'] },
                { match: /gudi padwa|ugadi|marathi new year/, name: name, greeting: name + ' ki hardik shubhkamnayein! 🌿', theme: 'generic', symbols: ['🌿', '✨'] },
                { match: /chhath/, name: 'Chhath Puja', greeting: 'Chhath Puja ki hardik shubhkamnayein! 🙏', theme: 'generic', symbols: ['🌅', '✨'] },
                { match: /guru nanak|gurpurab/, name: 'Guru Nanak Jayanti', greeting: 'Guru Nanak Jayanti ki hardik shubhkamnayein! 🙏', theme: 'generic', symbols: ['🙏', '✨'] },
                { match: /christmas/, name: 'Christmas', greeting: 'Christmas ki hardik shubhkamnayein! 🎄', theme: 'christmas', symbols: ['🎄', '✨'] },
                { match: /republic day|independence day/, name: name, greeting: name + ' ki hardik shubhkamnayein! 🇮🇳', theme: 'tricolor', symbols: ['🇮🇳', '✨'] },
                { match: /makar sankranti|pongal/, name: name, greeting: name + ' ki hardik shubhkamnayein! 🌾', theme: 'generic', symbols: ['🌾', '✨'] },
                { match: /janmashtami/, name: 'Janmashtami', greeting: 'Janmashtami ki hardik shubhkamnayein! 🙏', theme: 'generic', symbols: ['🦚', '✨'] },
                { match: /navratri|durga puja/, name: name, greeting: name + ' ki hardik shubhkamnayein! 🙏', theme: 'navratri', symbols: ['🌼', '✨'] },
                { match: /eid/, name: name, greeting: name + ' ki hardik shubhkamnayein! 🌙', theme: 'generic', symbols: ['🌙', '✨'] },
                { match: /raksha bandhan/, name: 'Raksha Bandhan', greeting: 'Raksha Bandhan ki hardik shubhkamnayein! 🌼', theme: 'generic', symbols: ['🌼', '✨'] },
                { match: /maha shivratri|shivratri/, name: 'Maha Shivratri', greeting: 'Maha Shivratri ki hardik shubhkamnayein! 🙏', theme: 'generic', symbols: ['🙏', '✨'] },
                { match: /ram navami/, name: 'Ram Navami', greeting: 'Ram Navami ki hardik shubhkamnayein! 🙏', theme: 'dussehra', symbols: ['🏹', '🌼'] }
            ];
            return mappings.find(item => item.match.test(lower)) || null;
        }

        async function loadDTSFestivalCalendar() {
            const now = new Date();
            const year = now.getFullYear();
            const localDate = year + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

            const addFestival = item => {
                if (!item || item.date !== localDate) return false;
                const mapped = festivalFromHolidayName({
                    localName: item.localName || item.nameHi || item.name,
                    name: item.name || item.nameEn || item.localName
                });
                if (!mapped) return false;
                DTS_FESTIVAL_CALENDAR[localDate] = mapped;
                updateAIGreeting();
                return true;
            };

            // First choice: Nager.Date Community v4 public-holiday source; no API key is needed.
            // This can correctly override lunar-festival dates where it publishes them.
            try {
                const response = await fetch('https://nagerholidays.com/api/v4/Holidays/IN/' + year, {
                    cache: 'no-store'
                });
                if (response.ok) {
                    const holidays = await response.json();
                    const todayHoliday = Array.isArray(holidays)
                        ? holidays.find(item => item.date === localDate)
                        : null;
                    if (addFestival(todayHoliday)) return;
                }
            } catch (error) {
                // Try the legacy public endpoint before moving to the Indian calendar.
            }

            // Temporary compatibility fallback while older Nager deployments remain
            // available. Community v3 is scheduled to retire, so it is not the only
            // source used by this page.
            try {
                const response = await fetch('https://date.nager.at/api/v3/PublicHolidays/' + year + '/IN', {
                    cache: 'no-store'
                });
                if (response.ok) {
                    const holidays = await response.json();
                    const todayHoliday = Array.isArray(holidays)
                        ? holidays.find(item => item.date === localDate)
                        : null;
                    if (addFestival(todayHoliday)) return;
                }
            } catch (error) {
                // Continue to the Indian festival calendar below.
            }

            // Secondary: city-aware Indian festival calendar through the DTS backend.
            // The backend caches the upstream response and avoids browser CORS blocks.
            // Mumbai is used as the supported Maharashtra reference city.
            // This provider currently documents years 2025-2027, so Nager/fixed-date
            // fallbacks remain useful outside that range.
            if (year >= 2025 && year <= 2027) {
                try {
                    let response = await fetch(
                        'https://dts-tech-solutions.onrender.com/api/festivals?year=' + year + '&city=mumbai',
                        { cache: 'no-store' }
                    );
                    if (response.status === 202) {
                        await new Promise(resolve => setTimeout(resolve, 3500));
                        response = await fetch(
                            'https://dts-tech-solutions.onrender.com/api/festivals?year=' + year + '&city=mumbai',
                            { cache: 'no-store' }
                        );
                    }
                    if (response.ok) {
                        const payload = await response.json();
                        const todayItems = (Array.isArray(payload.festivals) ? payload.festivals : [])
                            .filter(item => item && item.date === localDate && item.rule)
                            .filter(item => {
                                const rule = item.rule;
                                const category = String(rule.observanceCategory || '').toUpperCase();
                                const regions = Array.isArray(rule.regions) ? rule.regions : [];
                                const localToMaharashtra = regions.some(region =>
                                    ['PAN_INDIA', 'MAHARASHTRA', 'WEST'].includes(String(region).toUpperCase())
                                );
                                return category === 'FESTIVAL' && localToMaharashtra;
                            })
                            .sort((a, b) => Number(Boolean(b.rule.isMajor)) - Number(Boolean(a.rule.isMajor)));

                        for (const item of todayItems) {
                            if (addFestival({
                                date: item.date,
                                name: item.rule.nameEn,
                                localName: item.rule.nameHi
                            })) return;
                        }
                    }
                } catch (error) {
                    // Network/API failure should never stop the rest of the website.
                }
            }

            // Only fixed Gregorian holidays remain as offline fallback. Lunar dates
            // are deliberately not guessed, so stale dates cannot trigger the wrong
            // festival animation.
        }

        function updateAIGreeting() {
            const greeting = document.getElementById('aiGreeting');
            const now = new Date();
            const festival = getDTSFestival(now);
            applyDTSFestivalAnimation(festival);
            if (!greeting) return;

            if (festival) {
                greeting.textContent = festival.greeting + ' Dynamic Technology Solutions (DTS) mein aapka swagat hai! Aaj hum aapki kya madad kar sakte hain?';
                return;
            }

            let timeGreeting = 'Good Evening';
            if (now.getHours() < 12) {
                timeGreeting = 'Good Morning';
            } else if (now.getHours() < 17) {
                timeGreeting = 'Good Afternoon';
            }
            greeting.textContent = timeGreeting + '! 👋 Dynamic Technology Solutions (DTS) mein aapka swagat hai. Aaj hum aapki kya madad kar sakte hain?';
        }

        /* =========================================================
           AI ASSISTANT - OPEN
           ========================================================= */

        function openAIAssistant() {

            const modal =
                document.getElementById(
                    'aiModal'
                );


            if (!modal) {
                return;
            }


            modal.classList.remove(
                'hidden'
            );


            document.body.classList.add(
                'modal-open'
            );


            setTimeout(
                function() {

                    const input =
                        document.getElementById(
                            'aiInput'
                        );

                    if (input) {
                        input.focus();
                    }

                },
                100
            );

        }


        /* =========================================================
           AI ASSISTANT - CLOSE
           ========================================================= */

        function closeAIAssistant() {

            const modal =
                document.getElementById(
                    'aiModal'
                );


            if (modal) {

                modal.classList.add(
                    'hidden'
                );

            }


            document.body.classList.remove(
                'modal-open'
            );

        }


        /* =========================================================
           AI MODAL BACKDROP
           ========================================================= */

        function handleAIModalBackdrop(event) {

            if (
                event.target &&
                event.target.id ===
                'aiModal'
            ) {

                closeAIAssistant();

            }

        }


        /* =========================================================
           AI INPUT AUTO RESIZE
           ========================================================= */

        function autoResizeAIInput(textarea) {

            if (!textarea) {
                return;
            }


            textarea.style.height =
                'auto';


            textarea.style.height =
                Math.min(
                    textarea.scrollHeight,
                    130
                ) + 'px';

        }


        /* =========================================================
           AI KEYDOWN
           ========================================================= */

        function handleAIKeydown(event) {

            if (
                event.key === 'Enter' &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendAIMessage();

            }

        }


        /* =========================================================
           AI MESSAGE HTML
           ========================================================= */

        function addAIMessage(message,type='bot'){
            const area=document.getElementById('aiMessageArea');
            if(!area)return;
            const messageDiv=document.createElement('div');
            messageDiv.className=`ai-message ${type}`;
            const cleanMessage=String(message||'').replace(/CUSTOM_HANDOFF/g,'').trim();
            messageDiv.innerHTML=formatAIMessage(cleanMessage);
            area.appendChild(messageDiv);
            if(type==='bot'&&String(message||'').includes('CUSTOM_HANDOFF')) addAICustomHandoffCard();
            area.scrollTop=area.scrollHeight;
        }

        function addAICustomHandoffCard(){
            const area=document.getElementById('aiMessageArea');
            if(!area||document.getElementById('aiCustomHandoff'))return;
            const card=document.createElement('div');
            card.id='aiCustomHandoff'; card.className='ai-action-card';
            card.innerHTML=`<div class="ai-action-title">This is a custom requirement. DTS can check/source the required product or solution.</div><div class="text-[10px] text-slate-500 mb-2">Choose how you want to connect with DTS:</div><div class="ai-action-buttons">
<a class="ai-action-button ai-action-whatsapp" href="#" target="_blank" rel="noopener noreferrer" onclick="return prepareDTSContact('whatsapp');"><i class="fa-brands fa-whatsapp"></i> WhatsApp DTS</a>
<a class="ai-action-button ai-action-call" href="tel:+918390909845"><i class="fa-solid fa-phone"></i> Call DTS</a>
<a class="ai-action-button ai-action-enquiry" href="#" onclick="return prepareDTSContact('enquiry');"><i class="fa-solid fa-paper-plane"></i> Send Enquiry</a></div>`;
            area.appendChild(card); area.scrollTop=area.scrollHeight;
        }

        function getAIConversationText(){return aiConversation.filter(m=>m&&m.role==='user').map(m=>m.content).join(' | ').slice(0,1200);}

        function prepareDTSContact(type){
            const requirement=getAIConversationText()||'Custom requirement from DTS website AI Assistant';
            const text='Hello DTS, I have a custom requirement from the website AI Assistant. Requirement: '+requirement;
            if(type==='whatsapp'){
                const url='https://wa.me/918390909845?text='+encodeURIComponent(text);
                const link=document.querySelector('#aiCustomHandoff .ai-action-whatsapp');
                if(link)link.href=url;
                return true;
            }
            if(type==='enquiry'){
                window.location.href='mailto:dtsboisar@gmail.com?subject='+encodeURIComponent('DTS Website Enquiry')+'&body='+encodeURIComponent(text);
                return false;
            }
            return true;
        }

        let selectedAIFeedback='';
        function showAIFeedback(){
            const area=document.getElementById('aiMessageArea');
            if(!area||document.getElementById('aiFeedbackCard'))return;
            const card=document.createElement('div'); card.id='aiFeedbackCard'; card.className='ai-feedback-card';
            card.innerHTML=`<div class="ai-feedback-title">How was your DTS AI Assistant experience?</div><div class="text-[10px] text-slate-500 mt-1">Your feedback helps us improve the website and service.</div><div class="ai-feedback-ratings">
<button class="ai-feedback-rating" onclick="selectAIFeedback(this,'Very Good')">⭐ Very Good</button><button class="ai-feedback-rating" onclick="selectAIFeedback(this,'Good')">🙂 Good</button><button class="ai-feedback-rating" onclick="selectAIFeedback(this,'Average')">😐 Average</button><button class="ai-feedback-rating" onclick="selectAIFeedback(this,'Poor')">☹️ Poor</button></div><textarea id="aiFeedbackText" class="ai-feedback-text" placeholder="Optional feedback..."></textarea><button id="aiFeedbackSubmit" class="ai-feedback-submit" onclick="submitAIFeedback()">Send Feedback</button>`;
            area.appendChild(card); area.scrollTop=area.scrollHeight;
        }
        function selectAIFeedback(button,rating){selectedAIFeedback=rating;document.querySelectorAll('.ai-feedback-rating').forEach(i=>i.classList.remove('selected'));button.classList.add('selected');}
        function submitAIFeedback(){
            if(!selectedAIFeedback){alert('Please select a rating first.');return;}
            const comment=document.getElementById('aiFeedbackText')?.value.trim()||'No comment';
            const body='DTS AI Assistant Feedback\nRating: '+selectedAIFeedback+'\nComment: '+comment;
            window.location.href='https://wa.me/918390909845?text='+encodeURIComponent(body);
            const button=document.getElementById('aiFeedbackSubmit'); if(button){button.textContent='Feedback Ready ✓';button.disabled=true;}
        }

        function formatAIMessage(message) {

            if (
                message === null ||
                message === undefined
            ) {

                return '';

            }


            let formatted =
                escapeHtml(
                    String(message)
                );


            formatted =
                formatted.replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong>$1</strong>'
                );


            // Only turn our WhatsApp draft URLs into links; escapeHtml runs first.
            formatted = formatted.replace(
                /(https:\/\/wa\.me\/[0-9]+(?:\?text=[^\s<]+)?)/g,
                '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-green-300 underline break-all">Open WhatsApp draft</a>'
            );


            formatted =
                formatted.replace(
                    /\n/g,
                    '<br>'
                );


            return formatted;

        }


        /* =========================================================
           AI TYPING INDICATOR
           ========================================================= */

        function showAITyping() {

            const area =
                document.getElementById(
                    'aiMessageArea'
                );


            if (!area) {
                return;
            }


            const existing =
                document.getElementById(
                    'aiTyping'
                );


            if (existing) {
                return;
            }


            const typing =
                document.createElement(
                    'div'
                );


            typing.id =
                'aiTyping';

            typing.className =
                'ai-message bot';


            typing.innerHTML = `
                <div class="typing-indicator">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>
            `;


            area.appendChild(
                typing
            );


            area.scrollTop =
                area.scrollHeight;

        }


        /* =========================================================
           REMOVE AI TYPING
           ========================================================= */

        function removeAITyping() {

            const typing =
                document.getElementById(
                    'aiTyping'
                );


            if (typing) {
                typing.remove();
            }

        }


        /* =========================================================
           AI SEND BUTTON STATE
           ========================================================= */

        function setAISendingState(
            sending
        ) {

            const button =
                document.getElementById(
                    'aiSendButton'
                );

            const input =
                document.getElementById(
                    'aiInput'
                );


            if (button) {

                button.disabled =
                    sending;

                button.style.opacity =
                    sending
                        ? '0.55'
                        : '1';

            }


            if (input) {

                input.disabled =
                    sending;

            }

        }


        /* =========================================================
           LOCAL AI FALLBACK
           ========================================================= */

        function getLocalAssistantResponse(
            message
        ) {

            const text =
                String(message || '')
                    .toLowerCase();


            if (
                text.includes('cctv') ||
                text.includes('camera') ||
                text.includes('surveillance')
            ) {
                const quantityMatch = text.match(/[0-9]+/);
                const quantityNote = quantityMatch
                    ? 'Noted: ' + quantityMatch[0] + ' CCTV camera(s). '
                    : 'Sure, DTS can help with CCTV. ';

                return quantityNote +
                    'Installation kis location par chahiye? Cameras indoor, outdoor ya dono ke liye hain?';
            }


            if (
                text.includes('network') ||
                text.includes('switch') ||
                text.includes('lan') ||
                text.includes('wifi') ||
                text.includes('wi-fi')
            ) {

                return `
                    I can help with networking requirements.

                    Please tell me:
                    1. Office, factory or other site?
                    2. Approximate number of users/devices?
                    3. Required LAN, Wi-Fi, fiber or all?
                    4. Do you need managed switches?
                    5. Is this a new setup or an upgrade?

                    DTS can support network planning, supply, installation and configuration.
                `;

            }


            if (
                text.includes('server') ||
                text.includes('nas') ||
                text.includes('storage') ||
                text.includes('backup')
            ) {

                return `
                    For server and storage requirements, please share:

                    1. Office/factory/site type
                    2. Number of users
                    3. Approximate data size
                    4. Server, NAS or both
                    5. Backup requirement
                    6. Existing infrastructure, if any

                    I can then help structure the requirement for DTS.
                `;

            }


            if (
                text.includes('electrical') ||
                text.includes('panel') ||
                text.includes('power')
            ) {

                return `
                    For electrical work, please tell me:

                    1. Commercial or industrial site?
                    2. What type of panel/work is required?
                    3. Approximate load, if known
                    4. New installation or modification?
                    5. Required completion date

                    DTS can support electrical panel and related technical requirements.
                `;

            }


            if (
                text.includes('fire') ||
                text.includes('alarm') ||
                text.includes('safety')
            ) {

                return `
                    I can help with fire safety requirements.

                    Please share:
                    1. Site type
                    2. Approximate site/building size
                    3. New installation or existing system?
                    4. Fire alarm, suppression or complete safety system?
                    5. Required inspection/installation date

                    DTS can support supply, installation and maintenance.
                `;

            }


            if (
                text.includes('access control') ||
                text.includes('biometric') ||
                text.includes('rfid') ||
                text.includes('door access')
            ) {

                return `
                    For access control, please tell me:

                    1. Number of doors
                    2. Office/factory/site type
                    3. Biometric, RFID/card or both?
                    4. Attendance integration required?
                    5. New installation or upgrade?

                    DTS can help with access-control supply, installation and configuration.
                `;

            }


            if (
                text.includes('amc') ||
                text.includes('maintenance') ||
                text.includes('support')
            ) {

                return `
                    DTS provides AMC and technical maintenance support.

                    Please tell me:
                    1. Which system needs AMC?
                    2. CCTV, network, IT, electrical or multiple systems?
                    3. Site location?
                    4. Existing system details?
                    5. Required AMC start date?

                    I can help prepare the requirement for a quotation.
                `;

            }


            return `
                Sure — please describe your requirement in a little more detail.

                For example:
                “Factory ke liye complete network setup chahiye.”

                or:

                “Office mein 12 CCTV cameras aur mobile monitoring chahiye.”

                You can write naturally in Hindi or English.
            `;

        }


        /* =========================================================
           AI SEND MESSAGE
           ========================================================= */

        async function sendAIMessage() {

            const input = document.getElementById('aiInput');

            if (!input) return;

            const message = input.value.trim();

            if (!message) return;

            addAIMessage(message, 'user');
            input.value = '';
            autoResizeAIInput(input);

            aiConversation.push({
                role: 'user',
                content: message
            });

            setAISendingState(true);
            showAITyping();

            const AI_BACKEND_URL =
                'https://dts-tech-solutions.onrender.com/api/chat';
            const abortController = new AbortController();
            const timeoutId = window.setTimeout(function() {
                abortController.abort();
            }, 35000);

            try {
                const response = await fetch(
                    AI_BACKEND_URL,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        signal: abortController.signal,
                        body: JSON.stringify({
                            messages: [{ role: 'user', content: message }],
                            session_id: aiSessionId,
                        })
                    }
                );

                const data = await response.json().catch(function() {
                    return {};
                });

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        `AI backend returned HTTP ${response.status}`
                    );
                }

                removeAITyping();

                const reply =
                    data.reply ||
                    data.message ||
                    data.response;

                if (!reply) {
                    throw new Error('AI returned an empty response');
                }

                addAIMessage(reply, 'bot');

                aiConversation.push({
                    role: 'assistant',
                    content: reply
                });

                // Keep the enquiry handoff focused on the confirmed customer requirement.
                // Feedback must never replace or contaminate the WhatsApp enquiry draft.

            } catch (error) {

                console.warn(
                    'AI backend unavailable:',
                    error
                );

                removeAITyping();

                // Do not pretend the local fallback processed this enquiry.
                // The backend owns conversation state, so ask the customer to retry.
                const userBubbles = document.querySelectorAll('#aiMessageArea .ai-message.user');
                if (userBubbles.length) {
                    userBubbles[userBubbles.length - 1].remove();
                }

                if (
                    aiConversation.length &&
                    aiConversation[aiConversation.length - 1].role === 'user' &&
                    aiConversation[aiConversation.length - 1].content === message
                ) {
                    aiConversation.pop();
                }

                input.value = message;
                autoResizeAIInput(input);

                const errorText = error && typeof error.message === 'string'
                    ? error.message.trim()
                    : '';
                const isFriendlyBackendError = errorText &&
                    !errorText.startsWith('AI backend returned HTTP') &&
                    errorText !== 'Failed to fetch' &&
                    errorText !== 'Load failed' &&
                    errorText !== 'NetworkError when attempting to fetch resource.';

                const outageMessage = error && error.name === 'AbortError'
                    ? 'DTS AI ka response time par nahi aaya.'
                    : (isFriendlyBackendError
                        ? errorText
                        : 'DTS AI backend se connection nahi ho pa raha.');

                addAIMessage(
                    outageMessage + ' Aapka message process nahi hua. Aapka text input mein wapas rakha hai; kripya connection restore hone par Send dobara dabayein.',
                    'bot'
                );

            } finally {

                window.clearTimeout(timeoutId);
                setAISendingState(false);

                setTimeout(function() {
                    if (input) input.focus();
                }, 50);

            }
        }

        /* =========================================================
           AI CONVERSATION RESET
           ========================================================= */

        function resetAIConversation() {

            aiSessionId = createAISessionId();
            aiConversation = [];
            const area =
                document.getElementById(
                    'aiMessageArea'
                );


            if (!area) {
                return;
            }


            area.innerHTML = `

                <div class="ai-message bot">

                    <span id="aiGreeting">Good Afternoon! 👋 I’m the DTS AI Assistant.</span>

                    Tell me what you need in your own words.

                    </div>

            `;

            // Reapply the current time/festival greeting after resetting the conversation.
            updateAIGreeting();
        }


        /* =========================================================
           DOM READY
           ========================================================= */

        /*
         * Catalogue is initialized directly because this script is loaded
         * after the catalogue DOM. This also prevents a missed
         * DOMContentLoaded event from leaving the product grid blank.
         */
        try {
            // Build product cards only as the catalogue approaches the viewport.
            // This keeps the large catalogue render off the critical first paint.
            scheduleCatalogueInitialization();
            updateAIGreeting();

            // Start external festival-calendar requests after the initial render.
            // Fixed-date decorations remain available while live dates are fetched.
            window.setTimeout(loadDTSFestivalCalendar, 1500);

            // Keep the greeting and decorations current if the page stays open
            // across midnight, and refresh the date on a visitor returning to the tab.
            window.setInterval(function () {
                updateAIGreeting();
                loadDTSFestivalCalendar();
            }, 6 * 60 * 60 * 1000);
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden) {
                    updateAIGreeting();
                    loadDTSFestivalCalendar();
                }
            });

            initializeDTSScrollEffects();
        } catch (error) {
            console.error('Catalogue initialization failed:', error);
        }

    

        function scheduleCatalogueInitialization() {
            const catalogue = document.getElementById('catalogue') ||
                document.getElementById('productGrid');

            let initialized = false;
            let observer = null;

            function initializeOnce() {
                if (initialized) return;
                initialized = true;
                if (observer) observer.disconnect();

                const render = function () {
                    try {
                        initializeCatalogue();
                    } catch (error) {
                        console.error('Deferred catalogue initialization failed:', error);
                    }
                };

                if (typeof window.requestIdleCallback === 'function') {
                    window.requestIdleCallback(render, { timeout: 1200 });
                } else {
                    window.setTimeout(render, 200);
                }
            }

            if (!catalogue || !('IntersectionObserver' in window)) {
                window.setTimeout(initializeOnce, 250);
                return;
            }

            observer = new IntersectionObserver(function (entries) {
                if (entries.some(function (entry) { return entry.isIntersecting; })) {
                    initializeOnce();
                }
            }, { rootMargin: '600px 0px' });

            observer.observe(catalogue);
        }

        /* Reveal content gently as the visitor scrolls; leave it visible if unsupported. */
        function initializeDTSScrollEffects() {
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return;
            }
            if (!('IntersectionObserver' in window)) return;

            const targets = document.querySelectorAll(
                'main section, body > section, .product-card'
            );
            targets.forEach(function (element) {
                element.classList.add('dts-scroll-reveal');
            });

            const observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('dts-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

            targets.forEach(function (element) {
                observer.observe(element);
            });
        }
