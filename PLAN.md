# İnşa planı

İlk inşa edilen parça, en riskli olan ve en çok şeyin dayandığı parçadır: protokolün üç hedefte gerçekten çalışması. Skill'ler en sona kalır, çünkü bir skill ancak var olan bir araç zincirini anlatabilir.

Her kilometre taşı çalışan bir gösterimle biter ve "bitti" koşulu ölçülebilir yazılmıştır.

```
M0 sözleşmeler
 └─ M1 dikey dilim: protokol üç hedefte
     └─ M2 etkileşimli CLI ve cihaz hedefleri
         └─ M3 şablonlar ve nativestep init
             └─ M4 nativestep lint · nativestep scan · nativestep status
                 └─ M5 göç skill'leri ve örnek uygulamalar
                     └─ M6 döngü skill'leri ve gate'ler
                         └─ M7 pilot göç
                             └─ M8 paketleme
```

M5'teki örnek uygulamaların yazımı M1'den itibaren paralel ilerleyebilir; `step-adopt` skill'inin bitmesi ise `nativestep scan`'e (M4) bağlıdır.

## M0 · Sözleşmeler ✓

- README.md, ARCHITECTURE.md, PROTOCOL.md, COMPONENTS.md, PLAN.md

**Bitti:** mühendis dokümanları okudu ve aşağıdaki açık kararları verdi.

## M1 · Dikey dilim ✓

Amaç: aynı test dosyasının üç hedefte koşması.

1. `kits/test-sdk` ve `_sample` uygunluk testleri önce yazılır. Diğer parçaların spec'i bunlardır.
2. Ardından birbirinden bağımsız üç iş gelir. Her biri yalnızca PROTOCOL.md'ye ve uygunluk testlerine bakar, bu yüzden ayrı session'larda paralel yapılabilir:
   - `kits/ios`: NativeStepKit ve NativeStepHostKit'in stdio kısmı, Swift'te `Sample`
   - `kits/android`: nativestep-kit-core ve nativestep-kit-host'un stdio kısmı, Kotlin'de `Sample`
   - `kits/flutter`: nativestep_adapter çekirdeği ve elle yazılmış bir binding'le `examples/flutter-sample`
3. En küçük `nativestep test`: `nativestep.json`'u okur, hedefin `build` komutunu bir kez çalıştırır, sonra testleri koşar.

Örnek native projeler geçici olarak `examples/native-sample/` altında durur ve M3'te şablona taşınır.

**Bitti:**
- `nativestep test _sample --target flutter,ios,android` üç hedefte de yeşil.
- Host süreci açıkken iOS ve Android'de test başına ortalama süre 300 ms'nin altında.
- `_probeNetwork` iki native hedefte de `network_blocked` döndürüyor.

**Sonuç (2026-11-10):** 12 uygunluk testi üç hedefte de yeşil. Test başına ortalama süre iOS'ta 45 ms, Android'de 61 ms, Flutter'da 58 ms. Flutter hedefi macOS debug uygulaması olarak çalışıyor ve TCP'den bağlanılıyor; o yüzden testlerden önce açık olması gerekiyor (M2'de `nativestep session` bunu üstlenir).

Sonraya kalanlar: varsayılan `Clock` ve `IdGenerator` fixture'ları (M2), `--json` çıktısı (M2), `StepRecorder` (M5), `:app` modülü ve iOS `App` hedefi (M2).

Makine kurulumu: Bun 1.4 (`npm i -g bun`; Homebrew, Command Line Tools eski olduğu için kurmadı), Android Studio'nun JDK'sı (`JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`), Gradle wrapper'ı (Gradle 9.3.1 ilk derlemede `~/.gradle` altına iner; wrapper dosyaları Flutter'ın önbelleğinden alındı).

## M2 · Etkileşimli CLI ve cihaz hedefleri ✓

- `nativestep session start|stop`, `nativestep ls`, `nativestep do`. Headless oturum arka planda çalışır ve `.nativestep/` altında bir soketten konuşur.
- iOS ve Android debug uygulamalarında TCP sunucusu; Android için `adb forward`
- Tab ve Modal navigator'ları, ödünç action'ların tamamı
- `nativestep shot`

**Bitti:**
- Bir ajan yalnızca `nativestep ls` ve `nativestep do` ile örnek uygulamayı simülatörde ve emülatörde gezebiliyor.
- `nativestep shot` aynı test için üç hedeften görüntü üretiyor.
- `--device` ile `_sample` testleri simülatörde ve emülatörde de yeşil.

**Sonuç (2026-11-10):** 15 uygunluk testi (Tab ve Modal ile 3 test eklendi) beş koşuda da yeşil: headless iOS ve Android, simülatörde Flutter ve iOS, emülatörde Android. Süreler headless iOS'ta 0,9 s, Android'de 0,7 s; cihazda Flutter 3,7 s, iOS 2,3 s, Android 3,9 s. Bir ajan `session start --device`, `ls` ve `do` ile üç hedefte de örnek uygulamayı gezebiliyor. `nativestep shot` aynı test için üç hedefte de görüntü üretiyor; görüntüler aynı son durumu gösteriyor.

Yol üstünde çıkanlar:
- Android 17, çalışan uygulama güncellenince önce bir yer tutucu ekran açıyor ve `am start -W` uygulama dinlemeye başlamadan dönüyor. `adb forward` bağlantıyı yine de kabul edip kapattığı için `Connection.tcp` artık bir `hello` yanıtı gelene kadar deniyor.
- Flutter referansı macOS yerine iOS simülatöründe çalışıyor; böylece ekran görüntüsünü iOS hedefiyle aynı `simctl` komutu alıyor.

Sonraya kalanlar: varsayılan `Clock` ve `IdGenerator` fixture'ları (M5, ilk gerçek ekranla birlikte), `StepRecorder` (M5).

Makine kurulumu: XcodeGen (`brew install xcodegen`; Command Line Tools güncellendikten sonra), açık bir iOS simülatörü ve Android emülatörü. Android için `JAVA_HOME` hâlâ gerekli.

## M3 · Şablonlar ve `nativestep init` ✓

- `templates/ios`, `templates/android`, `templates/spec` ve `templates/ci`, `examples/native-sample`'dan çıkarılır.
- `nativestep init` yer tutucuları doldurur, kit'leri `kits/` altına kopyalar ve `nativestep.json` yazar.
- nativestep repo'sunun CI'ı her PR'da şablondan bir proje açar, derler ve `_sample` testlerini koşar.

**Bitti:**
- `nativestep init /tmp/demo --app Demo --ios-bundle-id com.demo.app --android-package com.demo.app` iki platformda derlenen bir proje açıyor.
- Açılan projede `nativestep test _sample --target ios,android` yeşil.

**Sonuç (2026-11-10):** `nativestep init` ile açılan `Demo` projesi (`com.demo.app`) iki platformda derleniyor: XcodeGen ve xcodebuild ile iOS simülatör uygulaması, Gradle ile debug APK. 15 uygunluk testi headless iOS'ta 0,7 s, Android'de 0,9 s'de yeşil. `examples/native-sample` artık elle tutulmuyor, `init --reference examples/flutter-sample --force` ile şablondan üretiliyor; yeniden üretilen hâli de yeşil.

Şablon kökü projenin köküne bire bir eşleniyor (`ios/`, `android/`, `spec/`, `nativestep.json`, `.gitignore`, `.github/workflows/parity.yml`). Android'e version catalog eklendi. `init` hiçbir dosya silmiyor ve symlink'in içine yazmayı reddediyor.

Doğrulanmayan: CI dosyaları (`.github/workflows/ci.yml`, şablondaki `parity.yml`) GitHub'da hiç koşmadı; repo henüz git deposu değil. Adımları yerelde aynı komutlarla koştum. `parity.yml`, M8'e kadar CLI'yi `NATIVESTEP_REPO` değişkenindeki repodan alıyor.

Sonraya kalanlar: `parity.yml`'a `nativestep lint` (M4), kit'lerin güncellenmesi (`nativestep kits update`, M8).

## M4 · `nativestep lint`, `nativestep scan`, `nativestep status`

- Lint: ARCHITECTURE.md'deki *lint* etiketli kurallar (R1, R5'teki adlar, R6, R10, R12, R17, R20). R5 ve R12 iki platformu karşılaştıran parity kontrolleridir.
- Scan: COMPONENTS.md §1'deki ham gerçekler.
- Status: `inventory.json` ve `.nativestep/results/`.

**Bitti:**
- Her lint kuralı, kasıtlı ihlal içeren bir örnek projede yakalanıyor; temiz projede yanlış alarm yok.
- `nativestep scan` farklı state yönetimi kullanan iki Flutter projesinde geçerli bir `raw` bölümü üretiyor.

## M5 · Göç skill'leri ve örnek uygulamalar

- `examples/flutter-riverpod`: kendi küçük Basket uygulamamız. Giriş, liste, detay ve sepet ekranları; Riverpod, Dio, go_router.
- İkinci girdi: farklı bir state yönetimi kullanan açık kaynak bir Flutter uygulaması (aday seçimi açık karar).
- Skill'ler: `step-adopt`, `step-reference`, `step-plan`.

**Bitti:**
- İki uygulamada da `profile.md`, `inventory.json` ve feature planı üretiliyor, binding yazılıyor ve `nativestep ls --target flutter` çalışıyor.
- İki uygulama arasında skill'lerde değişiklik gerekmiyor. Gerekiyorsa skill'e projeye özel bilgi sızmış demektir.

## M6 · Döngü skill'leri ve gate'ler

- `step-feature`, `step-test`, `step-screen`, `step-ui-review`, `step-arch-review`, `step-fix`
- `spec/memory.md` ve `spec/evidence/` akışı, otonom mod

**Bitti:**
- Örnek uygulamada bir feature altı gate'in hepsinden geçerek uçtan uca taşınıyor.
- Bir hata `step-fix` ile önce kırmızı bir testle yakalanıyor ve iki platformda düzeltiliyor.
- `flutter` hedefi olmadan, dokümandan yeni bir feature iki platformda paralel geliştiriliyor.

## M7 · Pilot göç

- `examples/flutter-riverpod`'un tamamı ve ikinci uygulamanın 2–3 feature'ı taşınır.
- Ölçülenler: checkpoint süresi, checkpoint başına mühendis yorumu, gate başına kalma oranı, test süresi.

**Bitti:** `nativestep status` %100 gösteriyor ve ölçümlerden çıkan düzeltmeler skill'lere ve kit'lere işlendi.

## M8 · Paketleme

- Claude Code plugin'i (`.claude-plugin/plugin.json`, marketplace kaydı)
- `nativestep` için macOS ve Linux binary'leri (`bun build --compile`)
- Kit sürümleme ve `nativestep kits update`
- Kullanıcı rehberi: kurulum ve ilk göç

**Bitti:** temiz bir makinede rehberi izleyen biri, M5'teki ikinci uygulamada ilk checkpoint'e ulaşıyor.

## Verilen kararlar

| Karar | Seçim | Gerekçe | Tarih |
|---|---|---|---|
| İsim | `nativestep` | Native'e adım adım, checkpoint checkpoint ilerlemeyi anlatır; göçten sonraki paralel geliştirmeyi de kapsar. npm, pub.dev ve GitHub'da boştu. `reflex` Shopify'ın Reflex'iyle, `rx` ReactiveX ile, `nativetwin` ise React Native için bir Tailwind kütüphanesi olan `@native-twin` ile karışıyordu. | 2026-11-10 |
| Adlandırma şeması | CLI `nativestep`, yapılandırma `nativestep.json`, çalışma dizini `.nativestep/`, iOS `NativeStepKit`, Android `nativestep-kit`, Flutter `nativestep_adapter`, test SDK'sı `@nativestep/test`, skill'ler `step-*` | Skill'lerin `step-` öneki `nativestep test` komutuyla `step-test` skill'ini birbirinden ayırır. | 2026-11-10 |
| Dil | Dağıtılan her şey İngilizce: README, ARCHITECTURE, PROTOCOL, COMPONENTS, skill'ler, CLI çıktısı, kod, kod yorumları ve şablonlardaki adlar. PLAN ve konuşmalar Türkçe. | Araç seti başka ekiplere dağıtılacak; skill'ler ve kod yorumları ajanlar için de İngilizce daha tutarlı. Bu yüzden şablondaki örnek ekran `Ornek` değil `Sample` (`_sample` testleri), dokümanlardaki örnek uygulama `Sepetim` değil `Basket`. | 2026-11-10 |
| State'te `null` | `null` alanlar yazılmaz, varsayılan değerler hep yazılır (PROTOCOL.md §4) | Swift'in Codable'ı nil'i zaten atlıyor; Kotlin'de `explicitNulls = false` ve `encodeDefaults = true` ile aynı JSON çıkıyor. | 2026-11-10 |
| `busy` | Kit'te oturum geneli bir sayaç (`Effects`); Flutter'da uçuştaki fixture çağrıları | Node başına `busy`, odakta olmayan ekranın effect'lerini kaçırıyordu. | 2026-11-10 |
| `Router` ve `Route` | Kit'te değil, her uygulamanın Core'unda | Route'lar uygulamaya özel; kit'te generic bir Router yalnızca karmaşıklık katıyordu. | 2026-11-10 |
| Android network guard | Varsayılan `ProxySelector` | SecurityManager JDK 24'te kalktı. ProxySelector HttpURLConnection, java.net.http, OkHttp ve socket'leri kapsıyor. | 2026-11-10 |
| Flutter referans hedefi | iOS simülatöründe debug uygulaması (M1'de macOS'ta), TCP | Flutter'ın headless çalışma yolu yok; `flutter test` içinde gerçek soket sunucusu sorunlu. Simülatörde ekran görüntüsü iOS hedefiyle aynı komutla alınıyor. | 2026-11-10 |
| Network guard'ın kapsamı | Yalnızca oturum boyunca (`start`'tan `stop`'a) açık | Debug uygulaması elle kullanılırken gerçek servislerle çalışabilmeli. | 2026-11-10 |
| Fixture servislerinin yeri | Paylaşılan host kütüphanesi: iOS'ta `CoreHost`, Android'de `:host`; debug uygulaması bunu bağlıyor | Headless host ve debug uygulaması aynı `fixtureCore`'u kullanıyor; release build'de yok (R20). | 2026-11-10 |
| Cihaz hedefinin hazırlanması | `nativestep.json`'da `device.build` (derle ve kur) ve `device.setup` (başlat, port yönlendir) | CLI hedefe özel kod içermiyor; her şey yapılandırmada. | 2026-11-10 |
| Kit dağıtımı | v1'de `init` kit'leri projenin `kits/` klasörüne kopyalıyor; SwiftPM, Maven ve pub kaydı sonra | Proje kendi başına derleniyor; kit sürümü `nativestep.json`'da. | 2026-11-10 |
| En düşük platform sürümleri | iOS 17, Android minSdk 26 | `@Observable` iOS 17 istiyor; minSdk 26 cihazların büyük çoğunluğunu kapsıyor. | 2026-11-10 |
| Şablonun yapısı | `templates/` projenin köküne bire bir eşleniyor; `examples/native-sample` bundan üretiliyor | Tek kaynak: şablonla örnek arasında kayma olmuyor. | 2026-11-10 |
| Modal ve sekme ağacı | Bir navigator'ın çocuğu ekrandaki dal: yığının tepesi, seçili sekme ya da açık modal | Modal açıkken altındaki sekmelerin ve yığınların ödünç action'ları kullanılamıyor; ekranda olanla protokolde görünen aynı. | 2026-11-10 |

## Açık kararlar

| Karar | Önerim | En geç |
|---|---|---|
| UI review modeli | Kodu yazan modelden farklı bir vision modeli | M6 |
| İkinci pilot uygulama | BLoC kullanan, 10–20 ekranlı açık kaynak bir uygulama | M5 |

## Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Binding yazılamayan Flutter ekranları (setState, widget içinde iş mantığı) | G0 düşer, insan review'u artar | `read-only` modu; `inventory.json`'da ekran bazında işaret |
| Fixture'ların servis sınırında olması | Gerçek network ve depolama kodu davranış testlerinde koşmaz | Mobile'da ince entegrasyon testleri (ARCHITECTURE.md §8) |
| Host başlatma süresi (`swift build`, Gradle) | Ajan döngüsü yavaşlar | `build` bir kez çalışır, host süreci koşu boyunca açık kalır |
| Build araçlarının stdout'u kirletmesi | Protokol bozulur | Host derlenmiş binary olarak çalışır; log'lar stderr'e gider |
| Yoklamaya dayalı testlerde kararsızlık | Rastgele kırmızılar | `busy` bilgisi, deterministik saat ve kimlik (R6) |
| Projelere kopyalanan kit'lerin ayrışması | Güncelleme zorlaşır | `nativestep.json`'da `kits` sürümü, M8'de `nativestep kits update` |
