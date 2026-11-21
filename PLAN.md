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

CI ilk kez GitHub'da (github.com/admcilgin/nativestep) 5 dk 17 sn'de yeşil koştu. Şablondaki `parity.yml` henüz bir projede koşmadı; M8'e kadar CLI'yi bu repodan alıyor (`NATIVESTEP_REPO` değişkeni başka bir repoya çevirir).

Sonraya kalanlar: `parity.yml`'a `nativestep lint` (M4), kit'lerin güncellenmesi (`nativestep kits update`, M8).

## M4 · `nativestep lint`, `nativestep scan`, `nativestep status` ✓

- Lint: ARCHITECTURE.md'deki *lint* etiketli kurallar (R1, R5'teki adlar, R6, R10, R12, R17, R20). R5 ve R12 iki platformu karşılaştıran parity kontrolleridir.
- Scan: COMPONENTS.md §1'deki ham gerçekler.
- Status: `inventory.json` ve `.nativestep/results/`.

**Bitti:**
- Her lint kuralı, kasıtlı ihlal içeren bir örnek projede yakalanıyor; temiz projede yanlış alarm yok.
- `nativestep scan` farklı state yönetimi kullanan iki Flutter projesinde geçerli bir `raw` bölümü üretiyor.

**Sonuç (2026-11-10):** `lint` yedi kuralın hepsini denetliyor. Testte bir projeye 16 kasıtlı ihlal konuyor ve hepsi doğru kural, dosya ve satırla yakalanıyor. Temiz projede hiçbir şey çıkmıyor; yorumlardaki ve string'lerdeki `Date()` sayılmıyor. İlk çalıştırmada şablonun kendisinde dört gerçek ihlal buldu: üç iOS node'u ayrı `+Introspection.swift` dosyasında değildi, Android'de `ui/` bir feature değildi. Şablon düzeltildi: node'lar kendi dosyalarında, ekranlar ve gerçek servis `Sample/` ve `About/` feature klasörlerinde. Android release build'i de derleniyor (R20).

`scan` dört Flutter projesinde geçerli bir `raw` bölümü üretti: `flutter-sample` (ChangeNotifier) ve repoda olmayan üç yerel uygulama (`provider`; `flutter_bloc` ve `get`; `flutter_riverpod`; 25 ile 172 arası Dart dosyası, 139 ile 232 arası paket). Channel sayıları elle sayımla aynı çıktı. Tarama her projede 100 ms'nin altında. `status`, envanteri ve son test sonuçlarını özetliyor.

Sonraya kalanlar: Dart tarafındaki channel adları (`scan` şimdilik yalnızca native tarafa bakıyor), state alanlarının iki platformda karşılaştırılması (şimdilik testler kapsıyor).

## M5 · Göç skill'leri ve örnek uygulamalar ✓

- `examples/flutter-riverpod`: kendi küçük Basket uygulamamız. Giriş, liste, detay ve sepet ekranları; Riverpod, Dio, go_router.
- İkinci girdi: farklı bir state yönetimi kullanan bir Flutter uygulaması. Karar (2026-11-20): açık kaynak bir aday yerine mühendisin yerel uygulaması movie_tracker.
- Skill'ler: `step-adopt`, `step-reference`, `step-plan`.

**Bitti:**
- İki uygulamada da `profile.md`, `inventory.json` ve feature planı üretiliyor, binding yazılıyor ve `nativestep ls --target flutter` çalışıyor.
- İki uygulama arasında skill'lerde değişiklik gerekmiyor. Gerekiyorsa skill'e projeye özel bilgi sızmış demektir.

**Sonuç (2026-11-20):** Üç skill iki uygulamada uçtan uca koşuldu ve iki uygulama arasında hiçbir skill dosyası değişmedi.

- Basket (`examples/flutter-riverpod`, Riverpod + go_router) → `examples/native-basket`: 5 ekran, 4 feature, 12 checkpoint.
- movie_tracker (mühendisin yerel uygulaması, açık kaynak değil; `flutter_bloc` + GetX ile DI ve navigasyon, Isar, sqflite, secure storage, platform channel, WidgetKit extension) → repo dışında `../movie-tracker-native`: 5 ekran, 4 feature, 13 checkpoint.
- İki uygulamada da beş ekranın hepsi simülatörde `ls`/`do` ile `driven` doğrulandı: hata kodları, `fixture_missing` ve aynı süreçte ikinci `start` dahil.

Skill'ler değişmedi ama araç ve kit'te iki hata çıktı, ikisi de düzeltildi:

- `init --reference` bundle id'yi pbxproj'daki ilk satırdan okuyordu; movie_tracker'da o satır widget extension'ınki. Artık `Runner/Info.plist` kullanan target'ın ayarlarından okunuyor (`cli/test/init.test.ts`).
- Flutter adapter'ı `"result": null`'ı reddediyordu; iOS ve Android kit'leri kabul ediyordu. Dönüş değeri olmayan metodlar için PROTOCOL.md §7'ye kural eklendi.

Binding'lerin en zor yerleri projeye özel kaldı ve profillere yazıldı: Riverpod 3'ün otomatik retry'ı kapatıldı; GetX'in global navigator'ı ve registry'si her `start`'ta sıfırlanıyor.

Sonraya kalanlar:

- İki profilin ve iki planın mühendis onayı (açık sorular profillerde).
- İki referans uygulama aynı simülatörde aynı portu (7357) dinliyor; yalnızca biri açıkken çalışılmalı.
- Widget'ların yüklediği resimler (`Image.network`) network guard'a takılıyor; movie_tracker'da referans fixture'larında `posterPath` yok. Bir `StepRecorder` ya da resim istisnası M6'da düşünülmeli.

## M6 · Döngü skill'leri ve gate'ler

- `step-feature`, `step-test`, `step-screen`, `step-ui-review`, `step-arch-review`, `step-fix`
- `spec/memory.md` ve `spec/evidence/` akışı, otonom mod

**Bitti:**
- Örnek uygulamada bir feature altı gate'in hepsinden geçerek uçtan uca taşınıyor.
- Bir hata `step-fix` ile önce kırmızı bir testle yakalanıyor ve iki platformda düzeltiliyor.
- `flutter` hedefi olmadan, dokümandan yeni bir feature iki platformda paralel geliştiriliyor.

**Ara durum (2026-11-20):** `step-test` yazıldı ve Basket'te koşuldu. `foundation` cp1 ile `auth` cp1–cp2 için 8 test ve fixture'ları (`spec/tests/{foundation,auth}/`, `spec/fixtures/{auth,catalog}/`) G0'da, yani Flutter referansında yeşil. Native taraf henüz yok; sıradaki adım `step-screen` ve bu checkpoint'lerin iOS ve Android'de G1'den geçmesi.

**Ara durum 2 (2026-11-20):** `step-screen` yazıldı ve Basket'te iki platformda koşuldu. iOS ve Android'de Core (`auth`, `catalog`, `basket` feature klasörleri), host'taki fixture servisleri ve Mobile katmanı (gerçek HTTP servisleri, Login, ürün listesi ve sepet ekranları) var. Sonuçlar:
- G1: 23/23, headless olarak iOS'ta ve Android'de (15 `_sample` + 8 Basket). Basket'in 8 testi iOS simülatöründeki gerçek uygulamada da yeşil.
- G2: lint temiz.
- Debug ve release derlemeleri iki platformda da başarılı.

Şablonun örnek kabuğu ile uygulamanın kabuğu arasındaki çakışma `conformance` bayrağıyla çözüldü (COMPONENTS.md §6). İlk feature'da şablonun `AppCore`'u `Sample/SampleCore`'a taşınıyor. Host, bayrak gelince onu kuruyor; debug uygulaması bu oturumlara `unsupported` dönüyor.

`examples/native-basket/{ios,android}` artık repoda. `kits` ise `../../kits`'e sembolik bağlantı.

Açık işler:
- `step-feature`, `step-ui-review` (G3), `step-arch-review` (G4) ve `step-fix`.
- Basket'in kalan checkpoint'leri.
- Android emülatöründe cihaz koşusu.
- `spec/evidence/` akışı.

**Ara durum 3 (2026-11-20):** `step-feature`, `step-ui-review` ve `step-arch-review` yazıldı. `foundation` cp1 altı gate'ten otonom modda geçti ve kapandı; kanıtı `spec/evidence/foundation-cp1/` altında, `nativestep status` 1/12 checkpoint gösteriyor.
- G3 ilk turda Android'de üç blocking fark buldu: status bar altında kalan başlık, eksik "Products" başlığı ve ikonsuz sekmeler. İki platformda da marka rengi tutmuyordu. Hepsi düzeltildi ve ekran görüntüleri yeniden alındı.
- Cihazda koşulan testler bun'ın 5 sn'lik varsayılan süresine takılıyordu. CLI artık cihaz koşularına 30 sn veriyor.
- Basket'in 8 testi Android emülatöründe de yeşil.
- G4 tek tur ve inline koşuldu. İzole iki tur için subagent gerekiyor; skill bu durumu kanıta yazdırıyor.

`auth` cp1 ve cp2 de kapandı: 2/4 feature ve 3/12 checkpoint tamam, Login `migrated`. Kanıtı `spec/evidence/auth-cp1-cp2/` altında.

Loading durumlarının ekran görüntüsü artık alınabiliyor. Bunun için `nativestep shot`'a `--no-wait` eklendi: uçuştaki çağrıları beklemiyor ve 200 ms bekleyip çekiyor. Login'in loading durumu üç hedefte de çekildi; Android'deki spinner boyutu referansa uyduruldu.

`catalog` cp1 de kapandı: 3 yeni test, G3'te iki minor düzeltme yapıldı, kanıtı `spec/evidence/catalog-cp1/` altında. `nativestep status` 4/12 checkpoint gösteriyor.

`catalog` cp2 (hata, retry, refresh) da kapandı; `nativestep status` 5/12 checkpoint gösteriyor.

`step-fix` yazıldı: hata önce protokol üzerinden yeniden üretiliyor ve türü belirleniyor (davranış, yalnızca view, gerçek servis ya da hata değil). Davranış hatası, onu gösteren kırmızı bir testle yakalanıyor. Düzeltme iki platformda yapılıyor, ardından gate'ler koşuluyor. "Bitti" maddesi için gerçek bir hata gerekiyor; uydurma bir hatayla koşulmayacak.

`catalog` cp3 (ürün detayı, geri, not_found, sekme hafızası) kapandı; `nativestep status` 6/12 checkpoint gösteriyor. İki kit'e de `TabNavigator(popsToRootOnReselect:)` eklendi; varsayılanı kapalı.

`catalog` cp4 (çıkış) ile `catalog` feature'ı tamamlandı: 3/4 feature, 7/12 checkpoint; ProductList `migrated`. Login ViewModel notu da uygulandı. Sepetin çıkıştan sonra kalıp kalmayacağı hâlâ mühendisin vereceği açık bir karar.

`basket` cp1 (detaydan sepete ekleme) kapandı; 8/12 checkpoint, ProductDetail `migrated`. Sepetin çıkıştan sonra kalması geçici olarak referanstaki gibi bırakıldı (`memory.md`).

`basket` cp2 (bir ekle, bir çıkar) kapandı; 9/12 checkpoint.

`basket` cp3 (sipariş verme, "Order placed" diyaloğu, sepet boşalır) kapandı; 10/12 checkpoint. G3'te eski bir görünüm hatası bulundu: Android'de durum çubuğu simgeleri açık zeminde açık renk. Bu, step-fix'in ilk gerçek vakası.

Android durum çubuğu step-fix ile düzeltildi. Tür: yalnızca görünüm. `enableEdgeToEdge()` eklendi, kanıt shot ile alındı. step-ui-review'e durum çubuğu satırı eklendi. Bu, M6'nın step-fix ölçütünü gerçek bir hatayla karşılıyor.

`basket` cp4 (sipariş hataları ve "placing" durumu) kapandı; 11/12 checkpoint. Profildeki açık soru ("hata, satırlar değişince kalır mı") geçici olarak referanstaki gibi uygulandı; kararı `memory.md`'de mühendisi bekliyor.

İkinci step-fix: iOS cihazında "geri git ve hemen sekme değiştir" yarış durumu. Bulunduğu yer: cp5'in G1 cihaz koşusu. Kök neden: cihaz host'u yanıtı UI geçişi bitmeden veriyordu. Düzeltme: `NativeStepHostKit` artık navigasyon geçişini bekliyor (en çok 1 s). Regresyon testi: `catalog/tab-switch`.

`basket` cp5 (sepet sayısı rozeti) kapandı. **basket özelliği tamam; 4/4 özellik, 12/12 checkpoint, 5/5 ekran migrated.** native-basket göçü otonom modda bitti.

Mühendisi bekleyenler:
- `memory.md`'deki iki geçici karar: sepet çıkışta korunuyor mu, sipariş hatası satırlar değişince kalıyor mu?
- G5 incelemesi: her checkpoint'in kanıtı `spec/evidence/` altında.
- G4'ün ikinci, izole koşusu hiç yapılmadı. Bu oturumda alt ajan kullanılmadı.

M6 "Bitti" ölçütlerinin durumu:
- **Altı gate'ten uçtan uca geçen feature:** karşılandı; 4 feature, 12 checkpoint. Eksikler: G5 (mühendis) otonom modda atlandı; G4'ün ikinci, izole koşusu yapılmadı.
- **step-fix ile kırmızı test ve iki platformda düzeltme:** kısmen karşılandı.
  - Android durum çubuğu: yalnızca görünüm, shot ile doğrulandı.
  - iOS cihaz host'unun hızı: kırmızı test (`catalog/tab-switch`), düzeltme kit'te.
  - İki hata da gerçek, ama hiçbiri iki platformda birden düzeltilen bir davranış hatası değil. Ölçüt, böyle bir hata çıktığında tam karşılanacak.
- **`flutter` hedefi olmadan, dokümandan yeni bir feature:** henüz yok.

Ölçüt 3 karşılandı: `search` feature'ı `flutter` hedefi olmadan, `docs/features/search.md`'deki kabul kriterlerinden geliştirildi.
- 7 test yazıldı, her kriter için bir tane. Önce iki platformda da kırmızıydı.
- Core ve görünümler iOS ve Android'de yazıldı.
- G1 headless ve cihazda yeşil; G2 temiz; G3 dokümana göre yapıldı; G4 onaylıyor.
- Paralellik eksik kaldı: iki platform sırayla yazıldı, çünkü bu oturumda alt ajan kullanılmadı. Ayrıca dokümanın ve testlerin mühendis onayı (G0) bekliyor.

M6'da kalan:
- izole ikinci G4 koşusu;
- iki platform için paralel step-screen koşusu (alt ajan izni gerekiyor);
- mühendisin vereceği kararlar (`memory.md`).

step-fix ölçütü tam karşılandı. Eski kodun denetiminde iki platformda birden gerçek bir davranış hatası bulundu: yüklenemeyen bir ürün oturum boyunca hatada kalıyordu.
- Kırmızı test: `catalog/product-detail-retry`. flutter, iOS ve Android'de kırmızıydı; referansta da aynı hata var.
- Düzeltme iki platformda da `AppCore.go` içinde. Testler headless ve cihazda yeşil.
- Beklenen davranış `memory.md`'de geçici karar olarak duruyor.

Sıradaki adım: M7'ye geçmeden önce mühendisle M6'yı gözden geçir.

## M7 · Pilot göç

- `examples/flutter-riverpod`'un tamamı ve ikinci uygulamanın 2–3 feature'ı taşınır.
- Ölçülenler: checkpoint süresi, checkpoint başına mühendis yorumu, gate başına kalma oranı, test süresi.

**Bitti:** `nativestep status` %100 gösteriyor ve ölçümlerden çıkan düzeltmeler skill'lere ve kit'lere işlendi.

**Ara durum (2026-11-20):** `flutter-riverpod`'un tamamı taşındı; `nativestep status` %100 gösteriyor.
- Ölçümler `examples/native-basket/spec/pilot-metrics.md`'de: checkpoint süresi, gate başına ilk geçişte kalma oranı, test süreleri ve bulunan hatalar. Mühendis yorumu ölçülemedi, çünkü göç otonom moddaydı.
- Ölçümlerden çıkan beş düzeltme skill'lere ve protokole işlendi.
- İkinci uygulama (`../movie-tracker-native`): foundation bitti. cp1 açılış, splash, giriş ya da sekmeler; cp2 tasarım token'ları ve Manrope (kanıt `spec/evidence/foundation-cp{1,2}/`). Kit'ler elle kopyalandı; `kits update` M8'de.
- Cihazda iki nativestep uygulaması aynı portu tutunca testler yanlış uygulamaya bağlanıp zaman aşımıyla düşüyordu. SDK ve CLI artık `hello`daki uygulama adını `nativestep.json` ile karşılaştırıp hemen duruyor (`9a961a1`). Android şablonu edge-to-edge düzeltmesini aldı.
- auth cp1 bitti: TMDB'nin üç adımlı girişi, oturum kimliği iOS'ta Keychain'de, Android'de Keystore anahtarıyla şifreli (kanıt `spec/evidence/auth-cp1/`).
- auth cp2 bitti: yükleniyor, boş alanlar, TMDB ve ağ hataları; auth feature'ı tamam.
- movies cp1 bitti: trend filmler açılışta yükleniyor, ızgara ve yükleniyor durumu (kanıt `spec/evidence/movies-cp1/`).
- Bulunan hata: `nativestep test a/ b/` yalnızca ilk filtreyi koşuyor ve geçti diyordu (`6bd8873`). auth'un cihaz koşuları yeniden yapıldı, 16/16.
- movies cp2 bitti: sayfalama, boş sayfada durma; görünümler yalnızca kaydırınca istiyor (kaynak gibi).
- movies cp3 bitti: arama, boş sonuç ve yeniden deneme, eski yanıtların atılması.
- movies cp4 bitti: yükleme hataları ve yeniden deneme; ilk trend sayfasının çevrimdışı kopyası gerçek serviste, iki platformda birim testleriyle.
- movies cp5 bitti: film ayrıntısı sekmelerin üstünde, geri dönüşte ızgara olduğu gibi.
- Kit'te eksikti: tamsayı şemasında izin verilen değerler (`enum`) yoktu; referans ekranda olmayan bir film kimliğine `invalid_input` diyordu, native uygulamalar yok sayıyordu. Üç kit'e `integer(oneOf:)` eklendi; movie-tracker'ın node'ları ekrandaki kimlikleri yayımlıyor, iki yeni test üç hedefte geçiyor (cihazda 47/47).
- movies cp6 bitti: sekmelerden çıkış girişe dönüyor; TMDB oturumu silinmeye çalışılıyor, yerel kimlik her durumda siliniyor. movies feature'ı tamam (6/6, cihazda 37/37).
- watchlist cp1 bitti: film ayrıntısında listeye ekleme ve çıkarma; gerçek depolama iki platformda atomik yazılan bir JSON dosyası, birim testli (cihazda 41/41).
- watchlist cp2 bitti: Listem sekmesi, en yeni üstte, açma ve çıkarma (cihazda 45/45).
- Bulunan açık: movies cp5'te ızgaradaki posterlere dokunulamıyordu. Testler node'un eylemini kullandığı için görmedi. Düzeltildi; step-ui-review artık her eylemin ekranda bir kontrolü olmasını ve cihazda bir kez dokunmayı istiyor.
- watchlist cp3 bitti: ana ekran widget'ı iki platformda; kaynağın widget kodu olduğu gibi taşındı, Core'un çağrısı birim testli. Referans bu çağrıyı fixture dışında yaptığı için davranış testi yok; cihazda uçtan uca görüldü.
- İkinci uygulama tamam: 5/5 ekran, 4/4 feature, 13/13 checkpoint; 45 test flutter, iOS ve Android cihazda geçiyor.
- Kalan: mühendisli bir koşu (`memory.md`'deki onaylar, oturum kapanınca listenin kalması sorusu); her checkpoint'te eksik olan ikinci bağımsız G4.

## M8 · Paketleme

- Claude Code plugin'i (`.claude-plugin/plugin.json`, marketplace kaydı)
- `nativestep` için macOS ve Linux binary'leri (`bun build --compile`)
- Kit sürümleme ve `nativestep kits update`
- Kullanıcı rehberi: kurulum ve ilk göç

- İlerleme: `nativestep kits update [--dry-run]` geldi. Repo'nun kit sürümü `kits/VERSION`'da (0.2.0: tamsayı şemalarında `oneOf`); `init` bunu `nativestep.json`'a yazar, `kits update` kopyayı repo'yla eşitler, build çıktısına dokunmaz, sürümü ilerletir. movie-tracker 0.1.0'dan 0.2.0'a geçti (dosyalar zaten aynıydı). Basket'in `kits/`'i repo'ya symlink; komut onu reddeder.

- İlerleme: Claude Code plugin'i geldi. Repo kökündeki `.claude-plugin/plugin.json` ve aynı yerde `marketplace.json` (repo kendi marketplace'i); `claude plugin validate` iki dosyayı da geçiriyor, `claude --plugin-dir .` dokuz skill'i yüklüyor (her oturuma ~935 token). Açık karar: lisans. Repo'da LICENSE yok; plugin dizinine göndermek için gerekiyor, seçimi mühendisin.

- İlerleme: binary'ler geldi. `bun cli/release.ts` her platform için `dist/nativestep-<target>.tar.gz` üretiyor: `bin/nativestep` (`bun build --compile`) ve yanında commit'li `kits/` ile `templates/`. Binary kit'leri ve şablonları kendi yanında arıyor; oturum daemon'u kendini binary olarak yeniden başlatıyor. darwin-arm64 arşivi repo dışında denendi: `init`, `kits update`, `lint`, `_sample` testleri (iOS ve Android 15/15), `session start/ls/stop`. `v*` etiketi CI'da arşivleri bir GitHub release'e ekliyor (`release.yml`); ilk etiketi atmak mühendisin işi. Release çıkınca şablondaki `parity.yml` CLI'yi checkout yerine release'ten alabilir.
- İlerleme: ilk release çıktı (v0.1.0, dört arşiv). Arşiv `gh` ile indirilip denendi: `init` kit 0.2.2 yazıyor, `lint` temiz. Binary yalnızca ad-hoc imzalı; tarayıcıyla indirilince macOS karantinaya alıyor, bu yüzden GUIDE `curl` ile indiriyor. Şablondaki `parity.yml` CLI'yi artık son release'ten alıyor.

- İlerleme: kullanıcı rehberi `GUIDE.md` yazıldı (makine, plugin ve CLI kurulumu, skill sırası, gate'ler, kit güncelleme); README'deki doküman tablosunun başında. Komutları CLI'ye ve gate tanımlarını COMPONENTS.md §9'a göre kontrol edildi. M8'in bitti koşulu henüz denenmedi: temiz bir makinede rehberi izleyen biri ve yayınlanmış ilk release gerekiyor; ikisi de mühendisin işi.

- İlerleme: rehber GitHub'dan taze bir klonla ve `flutter create` ile açılmış temiz bir Flutter uygulamasıyla adım adım izlendi: CLI derleme ve kurulum, `init --reference`, `lint`, `scan`, `_sample` testleri iOS ve Android'de hem headless hem cihazda (15/15). Bulunan üç hata düzeldi:
  1. `init`, Java anahtar kelimesi içeren bir paketi (`com.myapp.native`) kabul ediyordu, Gradle sonra reddediyordu. Artık `init` reddediyor.
  2. Simülatörde arka planda askıya alınmış başka bir nativestep uygulaması portu tutunca testler 30'ar saniye sessizce bekliyordu (13 test, 450 sn). Test SDK'sı artık her `hello` denemesine 3 sn veriyor ve 22 sn'de nedeni söyleyen tek bir hatayla duruyor.
  3. Reference'ta `_sample` atlaması native-sample'ın README'deki akışını bozmuştu. Artık `_sample` adı verilince koşuyor; yalnızca `_sample` varsa reference "skipped" sayılıyor.
  
  Kit'ler 0.2.1 oldu. Klon `main`'i alıyor; `release.ts` bu dal birleşince orada olacak. Plugin kurulumu (`/plugin marketplace add`) kullanıcı ayarını değiştirdiği için denenmedi.

- İlerleme: port paylaşımı. Aynı simülatörde iki projenin uygulaması aynı portu tutuyordu; proje değiştirmek her seferinde elle uygulama kapatmayı gerektiriyordu. Artık yalnızca öndeki uygulama dinliyor: iOS kit'i sahne arka plana geçince portu bırakıyor, öne gelince alıyor; Flutter'da binding `AppLifecycleListener` ile `close`/`listen` çağırıyor; Android'de launcher, başlamış bir activity varken dinliyor. Bind 10 sn boyunca yeniden deneniyor; test SDK'sı devir sırasında başka bir uygulamanın `hello`'sunu yeniden deniyor ve sıfırlanan soket hatasını yakalıyor (önceden bir sonraki testi düşürüyordu). native-sample ile movie-tracker arasında elle bir şey kapatmadan gidip gelindi: iOS 4/4, Flutter 10/10, Android 4/4; Basket üç hedefte, taze bir `init` iOS ve Android cihazda geçiyor. Kit'ler 0.2.2; step-reference'ın binding örneği ve üç binding güncellendi.

- İlerleme: rehber, `flutter create` ile açılmış temiz bir uygulamada ilk checkpoint'e kadar izlendi (üçüncü uygulama, Counter). step-adopt (profil, ekran listesi), step-reference (binding; `ls`/`do` ile 0→1→2), step-plan (tek feature `foundation`, iki checkpoint), step-feature cp1: G0 3/3 flutter; G1 headless 18/18 ve cihazda üç hedef; G2 temiz, release derleniyor; G3 notlarla geçti, buton iki cihazda da elle denendi; G4 tek koşu, ilk sonuç R8 yüzünden "changes" (state `send`'de değişiyordu), düzeltilip onaylandı; G5 atlandı (otonom). Proje scratchpad'de, git dışında. Skill'lere dönenler:
  1. Sayaç state'i widget içinde (`setState`), yani profil şablonuna göre `read-only` olacaktı ve G0 mühendis onayı isterdi. Binding element ağacından okuyup sürebiliyor; step-reference'ın binding rehberine "State kept inside widgets" bölümü eklendi.
  2. Android şablonunda ikon kütüphanesi yok; step-screen tek ikon için bağımlılık yerine `ImageVector` öneriyor.
  3. Her göçün `foundation` adımında şablon kabuğu `Sample/SampleCore`'a elle taşınıyor (Basket, movie-tracker, Counter: üçünde de aynı dosyalar). Şablonun bunu baştan ayrı getirmesi sonraki iş.

- İlerleme: rehberdeki `nativestep test --target flutter,ios,android --device` göç edilmiş bir uygulamada iOS ve Android'de 15 `_sample` testini düşürüyordu (debug uygulama conformance oturumlarını reddeder, bunlar headless koşar). Artık `--device` koşusu `_sample`'ı adı verilmedikçe atlıyor; movie-tracker'da komut olduğu gibi üç hedefte geçiyor.

**Bitti:** temiz bir makinede rehberi izleyen biri, M5'teki ikinci uygulamada ilk checkpoint'e ulaşıyor.

## M9 · Göçsüz başlangıç ve sürdürme

- Sıfırdan uygulama: Flutter olmadan iki native proje ve özellik dokümanları
- Göçün bitişi: referansı emekliye ayıran komut
- Takip: gate sonuçları ve sıradaki checkpoint `nativestep status`'ta
- Rehber: iki başlangıç yolu ve günlük döngü

- İlerleme: yeni skill `step-start`. `nativestep init`'i referanssız koşuyor, mühendisin anlattığını `docs/features/<feature>.md` dosyalarına çeviriyor (ekranlar ve state'leri, servis çağrıları ve hata kodları, numaralı kabul kriterleri `AC1…`), ekranları `reference: none` ile `spec/inventory.json`'a yazıyor. Tasarım çıktıları `docs/design/<feature>/<stem>.png`; stem `nativestep shot`'ın vereceği adla aynı. step-plan, step-test, step-screen, step-feature ve step-ui-review referans yokken bu dokümanları kullanıyor: her kabul kriterinin en az bir testi var ve test adı kriterin numarasıyla başlıyor; G0 mühendisin testleri dokümana göre onaylaması, G3 tasarımla ya da tasarım yoksa iki platformun birbiriyle karşılaştırılması.
- İlerleme: `nativestep migrate finish [--dry-run] [--force]`. Flutter repo'sundaki iki işaretli satırı, `flutter` hedefini ve `spec/adapters/flutter/`'ı kaldırıyor, `spec/profile.md`'yi `spec/archive/`'a taşıyor, `memory.md`'ye tarih düşüyor. Açık checkpoint varken `--force` olmadan reddediyor. Bundan sonra göç edilmiş proje yeni bir uygulama gibi geliştiriliyor.
- İlerleme: kanıt README'lerinde her gate'in bölümü bir `Result:` satırıyla başlıyor (`pass`, `fail`, `skipped — …`, `pending — …`). `nativestep status` bunları okuyor: `--features` her checkpoint'in gate'lerini gösteriyor, özet sıradaki checkpoint'i (devam eden, yoksa bağımlılıkları bitmiş ilk planlı) ve gate'i geçmemiş bitmiş checkpoint'leri (`attention`) veriyor. Basket'in kanıtlarına `Result:` satırları bölümlerin yazdığından eklendi: 13 checkpoint'in hepsinde G4 `pending` (ikinci yalıtılmış inceleme yok), `search` cp1'de G0 ve G5 mühendis onayı bekliyor.
- İlerleme: GUIDE iki başlangıç (§3 göç, §4 yeni uygulama), ortak gate'ler (§5), göçü bitirme (§6) ve günlük iş (§7) olarak yeniden düzenlendi. Plugin 0.2.0.

**Bitti:** sıfırdan bir uygulama step-start'tan ilk checkpoint'e kadar gate'lerden geçiyor; göç edilmiş bir uygulama `migrate finish` sonrası yeni bir feature'ı dokümandan ekliyor.

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
| Lint yöntemi | Yorumları boşaltılmış kaynakta metin kalıpları; Swift ve Kotlin parser'ı yok | Kurallar ad, import, çağrı ve klasör düzeyinde; parser iki platform için ağır bir bağımlılık olurdu. Tip gerektiren bir kural gelirse yeniden bakılır. | 2026-11-10 |
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
