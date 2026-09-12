(function () {
  'use strict';

  var UI_COPY={
    en:{explore:'Explore',events:'Events',articles:'Articles',track:'Track visa',assistant:'AI travel assistant',online:'Online now',hello:'Hi! I can help with visa options, documents, fees and tracking.',placeholder:'Ask about your visa…',send:'Send',
        waTitle:'Need human support?',waDesc:'Chat with a visa specialist on WhatsApp.',waBtn:'Chat with us',askAi:'Chat with us'},
    ml:{explore:'തിരയുക',events:'ഇവന്റുകൾ',articles:'ലേഖനങ്ങൾ',track:'വിസ ട്രാക്ക്',assistant:'AI യാത്രാ സഹായി',online:'ഇപ്പോൾ ഓൺലൈൻ',hello:'ഹായ്! വിസ ഓപ്ഷനുകൾ, രേഖകൾ, ഫീസ്, ട്രാക്കിംഗ് എന്നിവയിൽ ഞാൻ സഹായിക്കാം.',placeholder:'വിസയെക്കുറിച്ച് ചോദിക്കൂ…',send:'അയക്കുക',
        waTitle:'സഹായം ആവശ്യമുണ്ടോ?',waDesc:'WhatsApp-ൽ ഞങ്ങളോട് സംസാരിക്കൂ.',waBtn:'ചാറ്റ് ചെയ്യുക',askAi:'ചാറ്റ് ചെയ്യൂ'},
    hi:{explore:'एक्सप्लोर',events:'इवेंट्स',articles:'लेख',track:'वीज़ा ट्रैक करें',assistant:'AI यात्रा सहायक',online:'अभी ऑनलाइन',hello:'नमस्ते! मैं वीज़ा विकल्प, दस्तावेज़, शुल्क and ट्रैकिंग में मदद कर सकता हूँ।',placeholder:'वीज़ा के बारे में पूछें…',send:'भेजें',
        waTitle:'मानवीय सहायता चाहिए?',waDesc:'WhatsApp पर वीज़ा विशेषज्ञ से चैट करें।',waBtn:'हमसे चैट करें',askAi:'चैट करें'},
    ar:{explore:'استكشف',events:'الفعاليات',articles:'المقالات',track:'تتبع التأشيرة',assistant:'مساعد السفر الذكي',online:'متصل الآن',hello:'مرحباً! يمكنني المساعدة في خيارات التأشيرة والمستندات والرسوم والتتبع.',placeholder:'اسأل عن تأشيرتك…',send:'إرسال',
        waTitle:'هل تحتاج إلى مساعدة؟',waDesc:'تحدث مع خبير التأشيرات عبر واتساب.',waBtn:'تواصل معنا',askAi:'دردش معنا'},
    fr:{explore:'Explorer',events:'Événements',articles:'Articles',track:'Suivi visa',assistant:'Assistant IA',online:'En ligne',hello:'Bonjour ! Je peux vous aider avec les visas, documents et suivi.',placeholder:'Posez votre question…',send:'Envoyer',
        waTitle:'Besoin d\'aide humaine ?',waDesc:'Discutez avec un expert sur WhatsApp.',waBtn:'Discuter',askAi:'Discuter'},
    es:{explore:'Explorar',events:'Eventos',articles:'Artículos',track:'Seguimiento',assistant:'Asistente IA',online:'En línea',hello:'¡Hola! Puedo ayudarte con visados, documentos y seguimiento.',placeholder:'Haz una pregunta…',send:'Enviar',
        waTitle:'¿Necesitas ayuda?',waDesc:'Chatea con un experto en WhatsApp.',waBtn:'Chatear',askAi:'Chatear'}
  };

  var PAGE_COPY={
    en:{
      nav:['Visa Types','Visa Requirements','What happens after you apply','FAQs'],
      sections:[
        ['Choose a visa','Visa Types',''],
        ['Prepare before you apply','Visa requirements','Clear documents help us review your application without unnecessary delays.'],
        ['Simple from start to finish','What happens after you apply','Four clear steps, completed online from your phone or computer.']
      ],
      popular:'Popular choice',perApplicant:'per applicant',facts:['Stay','Entry','Processing Time'],
      benefits:['Simple online application','Secure document upload','Live status tracking'],apply:'Apply now',
      requirementTag:'Visa requirement',
      requirements:[
        ['Passport photo','A clear color copy of your passport\'s front and back pages. All four corners must be visible, and the text must be readable.','JPG, PNG or PDF'],
        ['Personal photo','A recent color photograph taken against a plain light/white background. The face must be clearly visible and front-facing.','JPG or PNG']
      ],
      benefitsList:[
        ['Why you should apply UAE Visa with us'],
        ['10,000+ visas issued','trusted by travellers worldwide'],
        ['Checked by a specialist','a real visa expert reviews every file'],
        ['Secure payment','pay by Visa, Mastercard or Amex'],
        ['Licensed US company','operated by TravelRox, Inc.']
      ],
      process:[
        ['Apply online','Fill in the short form and upload your passport, photo, ticket and accommodation. Pay securely.'],
        ['We verify and submit','A specialist checks your file and the UAE security clearance - WhatsApp ping if anything needs fixing.'],
        ['Get your visa','Apply today and get your UAE visa by {date}.']
      ],
      faqIntro:['Frequently asked','UAE visa questions,|answered clearly.','Need a more personal answer? Our AI assistant and visa team are always one tap away.','Ask VisaDoo AI'],
      faqs:[
        ['Which UAE visa should I choose?','Choose based on the duration of your stay (30 days or 60 days) and entry requirements (single or multiple entry). Compare the visa options above or chat with our team.'],
        ['What documents are required for a UAE visa?','You will need a clear copy of your passport bio page (front and back) and a recent color passport-size photograph with a white background.'],
        ['How long does UAE visa processing take?','The standard processing time is 3 to 5 working days. We recommend applying at least a week before your travel date.'],
        ['Can I apply completely online?','Yes, the entire process is 100% online. You can select your visa, upload documents, make the payment, and track the status on your mobile or computer.'],
        ['How will I receive my approved visa?','Once approved, your UAE eVisa will be issued as a PDF document. We will send it to you via email and WhatsApp.'],
        ['Can I get help with my application?','Yes, our support team is available 24/7. You can use our AI assistant or click the WhatsApp button to chat with our visa experts.'],
        ['Is my visa fee refundable if rejected?','Visa fees are charged by the government for processing and are non-refundable once the application is submitted to the immigration authorities.'],
        ['Do children need a separate visa for UAE?','Yes, all travellers including infants and children must have a valid visa to enter the country.'],
        ['Can I extend my UAE visa while in the country?','Yes, tourist visas can be extended inside the country. Please contact our support team at least 5 days before your visa expires to start the extension process.'],
        ['What is the validity of the UAE eVisa?','Once issued, the UAE eVisa is valid for entry within 60 days from the date of approval.'],
        ['Do I need to print my eVisa?','Yes, it is recommended to print a physical color copy of your approved eVisa and carry it with you along with your passport during travel.'],
        ['What happens if there is a spelling mistake on my visa?','If you notice any mistakes, contact us immediately. If the visa is already issued, a new application may be required as details cannot be modified after approval.']
      ]
    },
    ml:{
      nav:['വിസ തരങ്ങൾ','വിസ ആവശ്യകതകൾ','അപേക്ഷിച്ചതിന് ശേഷം എന്ത് സംഭവിക്കും','പതിവ് ചോദ്യങ്ങൾ'],
      sections:[
        ['ഒരു വിസ തിരഞ്ഞെടുക്കുക','വിസ തരങ്ങൾ','പ്രധാന വിവരങ്ങൾ താരതമ്യം ചെയ്ത് നിങ്ങളുടെ യാത്രയ്ക്ക് അനുയോജ്യമായ വിസ തിരഞ്ഞെടുക്കുക.'],
        ['അപേക്ഷിക്കും മുമ്പ് തയ്യാറാകൂ','വിസ ആവശ്യകതകൾ','വ്യക്തമായ രേഖകൾ അനാവശ്യ താമസമില്ലാതെ അപേക്ഷ പരിശോധിക്കാൻ സഹായിക്കും.'],
        ['തുടക്കം മുതൽ അവസാനം വരെ ലളിതം','അപേക്ഷിച്ചതിന് ശേഷം എന്ത് സംഭവിക്കും','ഫോണിലോ കമ്പ്യൂട്ടറിലോ പൂർത്തിയാക്കാവുന്ന നാല് ലളിതമായ ഘട്ടങ്ങൾ.']
      ],
      popular:'ജനപ്രിയം',perApplicant:'ഓരോ അപേക്ഷകനും',facts:['താമസം','പ്രവേശനം','പ്രോസസ്സിംഗ്'],
      benefits:['ലളിതമായ ഓൺലൈൻ അപേക്ഷ','സുരക്ഷിതമായ രേഖ അപ്‌ലോഡ്','തത്സമയ സ്റ്റാറ്റസ് ട്രാക്കിംഗ്'],apply:'ഇപ്പോൾ അപേക്ഷിക്കുക',
      requirementTag:'വിസ ആവശ്യകത',
      requirements:[
        ['പാസ്‌പോർട്ട് ഫോട്ടോ','നിങ്ങളുടെ പാസ്‌പോർട്ടിന്റെ മുൻഭാഗത്തെയും പിൻഭാഗത്തെയും പേജുകളുടെ വ്യക്തമായ കളர் കോപ്പി. നാല് കോണുകളും കാണത്തക്ക രീതിയിലായിരിക്കണം.','JPG, PNG അല്ലെങ്കിൽ PDF'],
        ['വ്യക്തിഗത ഫോട്ടോ','പ്ലെയിൻ ലൈറ്റ്/വൈറ്റ് പശ്ചാത്തലത്തിൽ എടുത്ത ഫോട്ടോ. മുഖം വ്യക്തമായി കാണുന്നതായിരിക്കണം.','JPG അല്ലെങ്കിൽ PNG']
      ],
      benefitsList:[
        ['എന്തുകൊണ്ട് ഞങ്ങളിലൂടെ UAE വിസയ്ക്ക് അപേക്ഷിക്കണം'],
        ['10,000+ വിസകൾ നൽകി','ലോകമെമ്പാടുമുള്ള യാത്രികർ വിശ്വസിക്കുന്നു'],
        ['വിദഗ്ദ്ധർ പരിശോധിക്കുന്നു','ഒരു യഥാർത്ഥ വിസ വിദഗ്ദ്ധൻ ഓരോ ഫയലും പരിശോധിക്കുന്നു'],
        ['സുരക്ഷിതമായ പണമടയ്ക്കൽ','വിസ, മാസ്റ്റർകാർഡ് അല്ലെങ്കിൽ ആമെക്സ് വഴി പണമടയ്ക്കാം'],
        ['ലൈസൻസുള്ള യുഎസ് കമ്പനി','ട്രാവൽറോക്സ് ഇൻക്. നടത്തുന്നു']
      ],
      process:[
        ['ഓൺലൈനായി അപേക്ഷിക്കുക','ചെറിയ ഫോം പൂരിപ്പിച്ച് നിങ്ങളുടെ പാസ്‌പോർട്ട്, ഫോട്ടോ, ടിക്കറ്റ്, താമസ വിവരങ്ങൾ എന്നിവ അപ്‌ലോഡ് ചെയ്യുക. USD-ൽ സുരക്ഷിതമായി പണമടയ്ക്കുക.'],
        ['ഞങ്ങൾ പരിശോധിച്ച് സമർപ്പിക്കുന്നു','ഒരു വിദഗ്ദ്ധൻ നിങ്ങളുടെ ഫയലും യുഎഇ സുരക്ഷാ ക്ലിയറൻസും പരിശോധിക്കുന്നു - എന്തെങ്കിലും മാറ്റം വരുത്തണമെങ്കിൽ വാട്ട്‌സ്ആപ്പിൽ മെസ്സേജ് അയയ്ക്കും.'],
        ['VisaDoo നേടുക','ഇന്ന് തന്നെ അപേക്ഷിക്കുക, നിങ്ങളുടെ PDF VisaDoo {date}-നകം നേടുക.']
      ],
      faqIntro:['പതിവായി ചോദിക്കുന്നത്','UAE വിസ ചോദ്യങ്ങൾ,|വ്യക്തമായ ഉത്തരങ്ങൾ.','കൂടുതൽ വ്യക്തിഗത സഹായം വേണോ? ഞങ്ങളുടെ AI സഹായിയും വിസ ടീമും എപ്പോഴും ലഭ്യമാണ്.','VisaDoo AI-യോട് ചോദിക്കുക'],
      faqs:[
        ['ഏത് UAE വിസയാണ് തിരഞ്ഞെടുക്കേണ്ടത്?','താമസിക്കാനുദ്ദേശിക്കുന്ന ദിവസങ്ങൾ, സിംഗിൾ അല്ലെങ്കിൽ മൾട്ടിപ്പിൾ എൻട്രി ആവശ്യം, യാത്രാ തീയതി എന്നിവ അടിസ്ഥാനമാക്കി തിരഞ്ഞെടുക്കുക.'],
        ['UAE വിസയ്ക്ക് ആവശ്യമായ രേഖകൾ എന്തൊക്കെയാണ്?','വ്യക്തമായ പാസ്‌പോർട്ട് ബയോ പേജും പുതിയ വ്യക്തിഗത ഫോട്ടോയും ആദ്യം തയ്യാറാക്കുക. ചില വിസകൾക്ക് കൂടുതൽ രേഖകൾ ആവശ്യപ്പെട്ടേക്കാം.'],
        ['UAE വിസ പ്രോസസ്സിംഗിന് എത്ര സമയം എടുക്കും?','വിസ തരവും അപേക്ഷകന്റെ വിവരങ്ങളും അനുസരിച്ച് സമയം വ്യത്യാസപ്പെടും. നിലവിലെ കണക്ക് ഓരോ വിസ കാർഡിലും കാണാം.'],
        ['പൂർണ്ണമായും ഓൺലൈനായി അപേക്ഷിക്കാമോ?','അതെ. ഓഫീസ് സന്ദർശിക്കാതെ വിസ തിരഞ്ഞെടുക്കാനും വിവരങ്ങൾ നൽകാനും രേഖകൾ അപ്‌ലോഡ് ചെയ്യാനും അപേക്ഷ ട്രാക്ക് ചെയ്യാനും കൂടാതെ ഫീസ് അടയ്ക്കാനും കഴിയും.'],
        ['അംഗീകരിച്ച വിസ എങ്ങനെ ലഭിക്കും?','സ്റ്റാറ്റസ് ഓൺലൈനിൽ പിന്തുടരാം. അംഗീകരിച്ച് ഇഷ്യൂ ചെയ്ത ശേഷം ഇ-വിസ രജിസ്റ്റർ ചെയ്ത കോൺടാക്റ്റിലേക്ക് അയയ്ക്കും.'],
        ['അപേക്ഷയ്ക്ക് സഹായം ലഭിക്കുമോ?','അതെ. ഉടൻ സഹായത്തിന് VisaDoo AI ഉപയോഗിക്കുക അല്ലെങ്കിൽ ഞങ്ങളുടെ വിസ ടീമുമായി WhatsApp-ൽ ചാറ്റ് ചെയ്യുക.'],
        ['വിസ നിരസിച്ചാൽ തുക തിരികെ ലഭിക്കുമോ?','ഇല്ല, വിസ അപേക്ഷകൾ പ്രോസസ്സ് ചെയ്യുന്നതിനായി ഗവൺമെന്റ് ഈടാക്കുന്ന തുകയായതിനാൽ വിസ നിരസിക്കപ്പെട്ടാലും ഫീസ് തിരികെ ലഭിക്കുന്നതല്ല.'],
        ['കുട്ടികൾക്ക് പ്രത്യേക വിസ ആവശ്യമുണ്ടോ?','അതെ, നവജാത ശിശുക്കൾ ഉൾപ്പെടെയുള്ള എല്ലാ യാത്രക്കാർക്കും യുഎഇയിലേക്ക് പ്രവേശിക്കാൻ സാധുതയുള്ള വിസ ആവശ്യമാണ്.'],
        ['രാജ്യത്ത് ആയിരിക്കുമ്പോൾ വിസ കാലാവധി നീട്ടാൻ കഴിയുമോ?','അതെ, ടൂറിസ്റ്റ് വിസകൾ രാജ്യത്തിനുള്ളിൽ വെച്ച് തന്നെ നീട്ടാൻ സാധിക്കും. ഇതിനായി വിസ കാലാവധി തീരുന്നതിന് 5 ദിവസം മുമ്പെങ്കിലും ഞങ്ങളുടെ ടീമുമായി ബന്ധപ്പെടുക.'],
        ['യുഎഇ ഇ-വിസയുടെ കാലാവധി എത്രയാണ്?','വിസ അനുവദിച്ച തീയതി മുതൽ 60 ദിവസത്തിനുള്ളിൽ യുഎഇയിലേക്ക് പ്രവേശിക്കാൻ ഈ ഇ-വിസ ഉപയോഗിക്കാവുന്നതാണ്.'],
        ['ഇ-വിസ പ്രിന്റ് ചെയ്യേണ്ടതുണ്ടോ?','അതെ, യാത്ര ചെയ്യുമ്പോൾ പാസ്‌പോർട്ടിനൊപ്പം നിങ്ങളുടെ ഇ-വിസയുടെ കളർ പ്രിന്റ് കോപ്പി കൈയിൽ കരുതുന്നത് നല്ലതാണ്.'],
        ['വിസയിൽ പേര് തെറ്റായി വന്നാൽ എന്തുചെയ്യും?','അക്ഷരത്തെറ്റുകൾ ശ്രദ്ധയിൽപെട്ടാൽ ഉടൻ ഞങ്ങളെ അറിയിക്കുക. വിസ ഇതിനകം ഇഷ്യൂ ചെയ്തിട്ടുണ്ടെങ്കിൽ, പുതിയ വിസയ്ക്ക് അപേക്ഷിക്കേണ്ടി വന്നേക്കാം.']
      ]
    },
    hi:{
      nav:['वीज़ा प्रकार','वीज़ा आवश्यकताएँ','आवेदन के बाद क्या होता है','सामान्य प्रश्न'],
      sections:[
        ['वीज़ा चुनें','वीज़ा प्रकार','ज़रूरी विवरणों की तुलना करें और अपनी यात्रा के लिए सही विकल्प चुनें।'],
        ['आवेदन से पहले तैयारी','वीज़ा आवश्यकताएँ','स्पष्ट दस्तावेज़ आपके आवेदन की समीक्षा बिना अनावश्यक देरी के करने में मदद करते हैं।'],
        ['शुरू से अंत तक आसान','आवेदन के बाद क्या होता है','फ़ोन या कंप्यूटर से ऑनलाइन पूरी होने वाली चार आसान प्रक्रियाएँ।']
      ],
      popular:'लोकप्रिय विकल्प',perApplicant:'प्रति आवेदक',facts:['ठहराव','प्रवेश','प्रोसेसिंग'],
      benefits:['आसान ऑनलाइन आवेदन','सुरक्षित दस्तावेज़ अपलोड','लाइव स्टेटस ट्रैकिंग'],apply:'अभी आवेदन करें',
      requirementTag:'वीज़ा आवश्यकता',
      requirements:[
        ['पासपोर्ट फोटो','आपके पासपोर्ट के आगे और पीछे के पन्नों की स्पष्ट रंगीन कॉपी। चारों कोने दिखाई देने चाहिए।','JPG, PNG या PDF'],
        ['व्यक्तिगत फोटो','सादे बैकग्राउंड पर सामने से ली गई हाल की रंगीन फोटो।','JPG या PNG']
      ],
      benefitsList:[
        ['हमारे साथ यूएई वीज़ा के लिए आवेदन क्यों करें'],
        ['10,000+ वीज़ा जारी किए गए','दुनिया भर के यात्रियों द्वारा विश्वसनीय'],
        ['विशेषज्ञ द्वारा जाँच','एक वास्तविक वीज़ा विशेषज्ञ प्रत्येक फ़ाइल की समीक्षा करता है'],
        ['सुरक्षित भुगतान','वीज़ा, मास्टरकार्ड या एमेक्स द्वारा भुगतान करें'],
        ['लाइसेंस प्राप्त अमेरिकी कंपनी','TravelRox, Inc. द्वारा संचालित']
      ],
      process:[
        ['ऑनलाइन आवेदन करें','छोटा फॉर्म भरें और अपना पासपोर्ट, फोटो, टिकट और आवास अपलोड करें। USD में सुरक्षित भुगतान करें।'],
        ['हम सत्यापित और जमा करते हैं','एक विशेषज्ञ आपकी फ़ाइल और यूएई सुरक्षा मंजूरी की जांच करता है - कुछ भी ठीक करने की आवश्यकता होने पर व्हाट्सएप पर पिंग करेंगे।'],
        ['अपना VisaDoo प्राप्त करें','आज ही आवेदन करें और {date} तक अपना पीडीएफ VisaDoo प्राप्त करें।']
      ],
      faqIntro:['अक्सर पूछे जाने वाले','UAE वीज़ा प्रश्न,|स्पष्ट उत्तर।','व्यक्तिगत उत्तर चाहिए? हमारा AI सहायक और वीज़ा टीम हमेशा उपलब्ध है।','VisaDoo AI से पूछें'],
      faqs:[
        ['मुझे कौन-सा UAE वीज़ा चुनना चाहिए?','ठहरने के दिनों, सिंगल या मल्टीपल एंट्री और यात्रा की तारीख के आधार पर वीज़ा चुनें।'],
        ['UAE वीज़ा के लिए कौन-से दस्तावेज़ चाहिए?','स्पष्ट पासपोर्ट बायो पेज और हाल की फोटो तैयार रखें। कुछ वीज़ा के लिए अतिरिक्त दस्तावेज़ माँगे जा सकते हैं।'],
        ['UAE वीज़ा प्रोसेसिंग में कितना समय लगता है?','समय वीज़ा प्रकार और आवेदक के विवरण पर निर्भर करता. वर्तमान अनुमान प्रत्येक वीज़ा कार्ड पर दिखाया गया है।'],
        ['क्या मैं पूरी तरह ऑनलाइन आवेदन कर सकता हूँ?','हाँ। कार्यालय जाए बिना वीज़ा चुनें, विवरण दें, दस्तावेज़ अपलोड करें और आवेदन ट्रैक करें।'],
        ['स्वीकृत वीज़ा मुझे कैसे मिलेगा?','स्टेटस ऑनलाइन देखें। स्वीकृति और जारी होने के बाद ई-वीज़ा आपके पंजीकृत संपर्क पर भेजा जाएगा।'],
        ['क्या आवेदन में सहायता मिलेगी?','हाँ। तुरंत मार्गदर्शन के लिए VisaDoo AI का उपयोग करें या WhatsApp पर हमारी टीम से बात करें।'],
        ['क्या वीज़ा अस्वीकृत होने पर शुल्क वापस मिल सकता है?','नहीं, सरकारी वीज़ा प्रसंस्करण शुल्क गैर-वापसी योग्य है और आवेदन जमा होने के बाद इसे वापस नहीं किया जा सकता।'],
        ['क्या बच्चों के लिए अलग वीज़ा की आवश्यकता होती है?','हाँ, शिशुओं सहित सभी यात्रियों के पास यूएई में प्रवेश करने के लिए एक वैध वीज़ा होना आवश्यक है।'],
        ['क्या मैं देश के भीतर रहते हुए अपना वीज़ा बढ़ा सकता हूँ?','हाँ, पर्यटक वीज़ा को देश के भीतर बढ़ाया जा सकता है। वीज़ा समाप्त होने से कम से कम 5 दिन पहले हमारी सहायता टीम से संपर्क करें।'],
        ['यूएई ई-वीज़ा की वैधता क्या है?','जारी होने के बाद, यूएई ई-वीज़ा अनुमोदन की तारीख से 60 दिनों के भीतर प्रवेश के लिए वैध होता है।'],
        ['क्या मुझे अपना ई-वीज़ा प्रिंट करने की आवश्यकता है?','हाँ, यात्रा के दौरान पासपोर्ट के साथ अपने स्वीकृत ई-वीज़ा की एक रंगीन प्रिंट कॉपी साथ रखना उचित है।'],
        ['यदि मेरे वीज़ा पर स्पेलिंग की गलती है तो क्या होगा?','यदि कोई गलती हो, तो तुरंत हमसे संपर्क करें। वीज़ा जारी होने के बाद विवरण में सुधार नहीं किया जा सकता, इसलिए नया आवेदन करना पड़ सकता है।']
      ]
    },
    ar:{
      nav:['أنواع التأشيرات','متطلبات التأشيرة','ماذا يحدث بعد التقديم','الأسئلة الشائعة'],
      sections:[
        ['اختر التأشيرة','أنواع التأشيرات','قارن التفاصيل الأساسية واختر الخيار المناسب لرحلتك.'],
        ['استعد قبل التقديم','متطلبات التأشيرة','تساعد المستندات الواضحة على مراجعة طلبك دون تأخير غير ضروري.'],
        ['بسيطة من البداية للنهاية','ماذا يحدث بعد التقديم','أربع خطوات واضحة يمكن إكمالها عبر الهاتف أو الكمبيوتر.']
      ],
      popular:'الخيار الشائع',perApplicant:'لكل متقدم',facts:['مدة الإقامة','الدخول','المعالجة'],
      benefits:['طلب إلكتروني بسيط','رفع آمن للمستندات','تتبع مباشر للحالة'],apply:'قدّم الآن',
      requirementTag:'متطلب التأشيرة',
      requirements:[
        ['صورة جواز السفر','نسخة ملونة واضحة لصفحتي جواز السفر الأمامية والخلفية مع ظهور الزوايا الأربع.','JPG أو PNG أو PDF'],
        ['صورة شخصية','صورة ملونة حديثة بخلفية بيضاء مع وضوح معالم الوجه.','JPG أو PNG']
      ],
      benefitsList:[
        ['لماذا يجب عليك التقديم للحصول على تأشيرة الإمارات معنا'],
        ['أكثر من 10,000 تأشيرة تم إصدارها','موثوق به من قبل المسافرين في جميع أنحاء العالم'],
        ['فحص من قبل خبير','خبير تأشيرات حقيقي يراجع كل ملف'],
        ['دفع آمن','الدفع بواسطة فيزا أو ماستركارد أو أمكس'],
        ['شركة أمريكية مرخصة','تدار بواسطة شركة TravelRox, Inc.']
      ],
      process:[
        ['التقديم عبر الإنترنت','ملء النموذج القصير وتحميل جواز السفر والصورة والتذكرة ومكان الإقامة. الدفع بأمان بالدولار الأمريكي.'],
        ['نتحقق ونرسل طلبك','يقوم خبير بمراجعة ملفك والموافقة الأمنية للإمارات - تنبيه عبر الواتساب إذا لزم تعديل أي شيء.'],
        ['استلم VisaDoo الخاصة بك','قدّم اليوم واستلم الـ VisaDoo الخاصة بك بصيغة PDF بحلول {date}.']
      ],
      faqIntro:['الأسئلة المتكررة','أسئلة تأشيرة الإمارات،|بإجابات واضحة.','هل تحتاج إلى إجابة شخصية؟ مساعدنا الذكي وفريق التأشيرات متاحان دائماً.','اسأل VisaDoo AI'],
      faqs:[
        ['أي تأشيرة إماراتية أختار؟','اختر حسب عدد أيام الإقامة والحاجة إلى دخول مفرد أو متعدد وتاريخ السفر.'],
        ['ما المستندات المطلوبة لتأشيرة الإمارات؟','جهّز صفحة بيانات جواز سفر واضحة وصورة شخصية حديثة. قد تُطلب مستندات إضافية لبعض التأشيرات.'],
        ['كم تستغرق معالجة تأشيرة الإمارات؟','تختلف المدة حسب نوع التأشيرة وبيانات المتقدم. يظهر التقدير الحالي في بطاقة كل تأشيرة.'],
        ['هل يمكنني التقديم بالكامل عبر الإنترنت؟','نعم. يمكنك اختيار التأشيرة وإرسال البيانات ورفع المستندات وتتبع الطلب دون زيارة مكتب.'],
        ['كيف أستلم التأشيرة المعتمدة؟','يمكنك متابعة الحالة عبر الإنترنت. بعد الموافقة والإصدار تُرسل التأشيرة الإلكترونية إلى بيانات الاتصال المسجلة.'],
        ['هل يمكنني الحصول على مساعدة؟','نعم. استخدم VisaDoo AI للإرشاد السريع أو تحدث مع فريق التأشيرات عبر WhatsApp.'],
        ['هل رسوم التأشيرة قابلة للاسترداد في حال الرفض؟','لا، الرسوم الحكومية غير قابلة للاسترداد بمجرد تقديم الطلب إلى الجهات المعنية بالهجرة.'],
        ['هل يحتاج الأطفال إلى تأشيرة منفصلة لدخول الإمارات؟','نعم، يحتاج جميع المسافرين بما في ذلك الرضع والأطفال إلى تأشيرة صالحة لدخول دولة الإمارات.'],
        ['هل يمكنني تمديد تأشيرة الإمارات أثناء وجودي في الدولة؟','نعم، يمكن تمديد التأشيرات السياحية من داخل الدولة. يرجى التواصل مع فريق الدعم قبل 5 أيام على الأقل من انتهاء التأشيرة.'],
        ['ما هي مدة صلاحية التأشيرة الإلكترونية للإمارات؟','بمجرد إصدارها، تكون التأشيرة صالحة للدخول خلال 60 يوماً من تاريخ الموافقة.'],
        ['هل يجب علي طباعة التأشيرة الإلكترونية؟','نعم، نوصي بطباعة نسخة ملونة من التأشيرة الإلكترونية المعتمدة وحملها معك إلى جانب جواز سفرك أثناء السفر.'],
        ['ماذا يحدث إذا كان هناك خطأ إملائي في تأشيرتي؟','إذا لاحظت أي أخطاء، تواصل معنا فوراً. بعد إصدار التأشيرة، قد يتطلب الأمر تقديماً جديداً لأن التعديل غير ممكن.']
      ]
    },
    fr:{
      nav:['Types de visas','Conditions requises','Que se passe-t-il après avoir postulé','FAQs'],
      sections:[
        ['Choisissez un visa','Types de visas','Comparez les détails essentiels et choisissez l’option idéale.'],
        ['Préparez votre demande','Conditions requises','Des documents clairs facilitent l’examen de votre dossier sans dossier.'],
        ['Simple du début à la fin','Que se passe-t-il après avoir postulé','Quatre étapes simples à réaliser en ligne depuis votre téléphone ou ordinateur.']
      ],
      popular:'Choix populaire',perApplicant:'par demandeur',facts:['Séjour','Entrée','Traitement'],
      benefits:['Demande en ligne simple','Téléchargement sécurisé','Suivi en direct'],apply:'Demander maintenant',
      requirementTag:'Condition requise',
      requirements:[
        ['Photo de passeport','Une copie couleur claire des pages avant et arrière de votre passeport. Les 4 coins doivent être visibles.','JPG, PNG ou PDF'],
        ['Photo d\'identité','Une photo d\'identité couleur récente sur fond uni clair, visage dégagé.','JPG ou PNG']
      ],
      benefitsList:[
        ['Pourquoi demander votre visa EAU avec nous'],
        ['Plus de 10 000 visas délivrés','approuvé par les voyageurs du monde entier'],
        ['Vérifié par un spécialiste','un véritable expert en visa examine chaque dossier'],
        ['Paiement sécurisé','payer par Visa, Mastercard ou Amex'],
        ['Entreprise américaine agréée','géré par TravelRox, Inc.']
      ],
      process:[
        ['Postuler en ligne','Remplissez le court formulaire et téléchargez votre passeport, photo, billet et hébergement. Payez en toute sécurité en USD.'],
        ['Nous vérifions et soumettons','Un spécialiste vérifie votre dossier et le contrôle de sécurité des Émirats arabes unis - message WhatsApp si des corrections sont nécessaires.'],
        ['Obtenez votre VisaDoo','Postulez aujourd’hui et obtenez votre VisaDoo PDF d’ici le {date}.']
      ],
      faqIntro:['Foire aux questions','Questions sur le visa EAU,|réponses claires.','Besoin d’une réponse personnalisée ? Notre assistant IA et notre équipe sont là.','Demander à VisaDoo IA'],
      faqs:[
        ['Quel visa EAU dois-je choisir ?','Choisissez en fonction du nombre de jours de séjour, entrée simple ou multiple, et votre date de voyage.'],
        ['Quels sont les documents requis ?','Commencez par la page d’identité de votre passeport et une photo récente. Des documents supplémentaires peuvent être demandés.'],
        ['Combien de temps prend le traitement ?','Le délai varie selon le type de visa et les détails. L’estimation est affichée sur chaque carte de visa.'],
        ['Puis-je faire la demande 100% en ligne ?','Oui. Vous pouvez choisir un visa, soumettre vos informations, télécharger vos documents et suivre votre demande en ligne.'],
        ['Comment vais-je recevoir mon visa approuvé ?','Vous pouvez suivre le statut en ligne. Une fois approuvé, le visa électronique est envoyé à vos coordonnées enregistrées.'],
        ['Puis-je obtenir de l’aide pour ma demande ?','Oui. Utilisez VisaDoo IA pour des conseils rapides ou discutez avec notre équipe via WhatsApp.'],
        ['Les frais de visa sont-ils remboursables en cas de refus ?','Non, les frais gouvernementaux ne sont pas remboursables une fois la demande soumise aux autorités.'],
        ['Les enfants ont-ils besoin d\'un visa individuel pour les EAU ?','Oui, tous les voyageurs, y compris les nourrissons et les enfants, doivent avoir un visa valide pour entrer aux EAU.'],
        ['Puis-je prolonger mon visa EAU depuis l\'intérieur du pays ?','Oui, les visas touristiques peuvent être prolongés. Contactez notre équipe au moins 5 jours avant l\'expiration.'],
        ['Quelle est la durée de validité de l\'eVisa pour les EAU ?','Une fois délivré, l\'eVisa est valable pour entrer dans le pays pendant 60 jours à compter de la date d\'approbation.'],
        ['Dois-je imprimer mon eVisa ?','Oui, il est recommandé d\'imprimer une copie couleur de votre eVisa et de la conserver avec votre passeport pendant le voyage.'],
        ['Que se passe-t-il s\'il y a une faute d\'orthographe sur mon visa ?','Contactez-nous immédiatement. Si le visa est déjà délivré, une nouvelle demande peut être nécessaire.']
      ]
    },
    es:{
      nav:['Tipos de visados','Requisitos','Qué pasa después de solicitar','Preguntas frecuentes'],
      sections:[
        ['Elige un visado','Tipos de visados','Compara detalles clave y elige la opción adecuada para tu viaje.'],
        ['Prepárate antes de solicitar','Requisitos del visado','Documentos claros ayudan a revisar tu solicitud sin demoras innecesarias.'],
        ['Sencillo de principio a fin','Qué pasa después de solicitar','Cuatro pasos claros completados en línea desde tu teléfono o computadora.']
      ],
      popular:'Opción popular',perApplicant:'por solicitante',facts:['Estancia','Entrada','Procesamiento'],
      benefits:['Solicitud en línea sencilla','Carga segura de documentos','Seguimiento en directo'],apply:'Solicitar ahora',
      requirementTag:'Requisito de visado',
      requirements:[
        ['Foto del pasaporte','Una copia a color clara de las páginas frontal y posterior de su pasaporte. Las 4 esquinas deben ser visibles.','JPG, PNG o PDF'],
        ['Foto personal','Una fotografía personal a color reciente sobre fondo claro y liso, rostro visible.','JPG o PNG']
      ],
      benefitsList:[
        ['Por qué solicitar su visa de EAU con nosotros'],
        ['Más de 10,000 visas emitidas','confiado por viajeros de todo el mundo'],
        ['Verificado por un especialista','un experto real en visas revisa cada archivo'],
        ['Pago seguro','pagar con Visa, Mastercard o Amex'],
        ['Empresa estadounidense registrada','operado por TravelRox, Inc.']
      ],
      process:[
        ['Solicitar en línea','Complete el formulario corto y cargue su pasaporte, foto, boleto y alojamiento. Pague de forma segura en USD.'],
        ['Verificamos y enviamos','Un especialista verifica su expediente y la autorización de seguridad de los EAU - mensaje de WhatsApp si se necesita corregir algo.'],
        ['Obtenga su VisaDoo','Solicite hoy y obtenga su VisaDoo en PDF para el {date}.']
      ],
      faqIntro:['Preguntas frecuentes','Preguntas del visado EAU,|respuestas claras.','¿Necesitas una respuesta personalizada? Nuestro asistente IA y equipo están siempre disponibles.','Preguntar a VisaDoo IA'],
      faqs:[
        ['¿Qué visado para EAU debo elegir?','Elige según la cantidad de días de estancia, si necesitas entrada única o múltiple, y tu fecha de viaje.'],
        ['¿Qué documentos se requieren para el visado de EAU?','Comienza con una copia clara del pasaporte y una foto reciente. Se pueden solicitar documentos adicionales.'],
        ['¿Cuánto tarda el procesamiento del visado?','El tiempo varía según el tipo de visado y detalles del solicitante. La estimación actual se muestra en cada tarjeta.'],
        ['¿Puedo solicitar completamente en línea?','Sí. Puedes seleccionar un visado, enviar detalles, cargar documentos y rastrear tu solicitud en línea.'],
        ['¿Cómo recibiré mi visado aprobado?','Puedes seguir el estado en línea. Una vez aprobado, el visado electrónico se envía a tus datos de contacto registrados.'],
        ['¿Puedo obtener ayuda con mi solicitud?','Sí. Utiliza VisaDoo IA para orientación rápida o chatea con nuestro equipo a través de WhatsApp.'],
        ['¿Se reembolsa la tasa de visa si es rechazada?','No, las tasas de visa del gobierno no son reembolsables una vez que la solicitud ha sido enviada a las autoridades.'],
        ['¿Necesitan los niños una visa individual para los EAU?','Sí, todos los viajeros, incluidos bebés y niños, deben tener una visa válida para entrar a los EAU.'],
        ['¿Puedo extender mi visa de los EAU estando en el país?','Sí, las visas de turista se pueden extender. Póngase en contacto con nuestro equipo al menos 5 días antes del vencimiento.'],
        ['¿Cuál es la validez de la eVisa para los EAU?','Una vez emitida, la eVisa es válida para ingresar al país durante 60 días a partir de la fecha de aprobación.'],
        ['¿Necesito imprimir mi eVisa?','Sí, se recomienda imprimir una copia a color de su eVisa aprobada y llevarla junto con su pasaporte durante el viaje.'],
        ['¿Qué pasa si hay un error de ortografía en mi visa?','Contáctenos de inmediato. Si la visa ya está emitida, es posible que se requiera una nueva solicitud.']
      ]
    }
  };

  function esc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(character){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function getLanguage(){
    var selector=document.getElementById('siteLanguage');
    return selector&&UI_COPY[selector.value]?selector.value:'en';
  }

  var LANGUAGE_DISPLAY={
    ar:{flag:'https://flagcdn.com/w40/sa.png',alt:'Arabic flag',name:'AR',code:'ar'},
    fr:{flag:'https://flagcdn.com/w40/fr.png',alt:'French flag',name:'FR',code:'fr'},
    es:{flag:'https://flagcdn.com/w40/es.png',alt:'Spanish flag',name:'ES',code:'es'},
    de:{flag:'https://flagcdn.com/w40/de.png',alt:'German flag',name:'DE',code:'de'},
    ru:{flag:'https://flagcdn.com/w40/ru.png',alt:'Russian flag',name:'RU',code:'ru'},
    en:{flag:'https://flagcdn.com/w40/gb.png',alt:'UK flag',name:'EN',code:'en'}
  };

  function updateFloatingLanguage(language){
    var item=LANGUAGE_DISPLAY[language]||LANGUAGE_DISPLAY.en;
    var headerName = document.querySelector('[data-language-header-name]');
    if(headerName) headerName.textContent = item.name;
    document.querySelectorAll('[data-language-option]').forEach(function(button){
      var code = button.getAttribute('data-language-option');
      button.setAttribute('aria-selected',String(code===language));
      var check = button.querySelector('i');
      if(check) {
        check.style.display = code === language ? 'inline-block' : 'none';
      }
    });
  }

  function setDirectText(node,value){
    if(!node||value==null) return;
    var textNode=Array.prototype.find.call(node.childNodes,function(child){return child.nodeType===3&&child.nodeValue.trim();});
    if(textNode) textNode.nodeValue=value+' ';
    else node.insertBefore(document.createTextNode(value+' '),node.firstChild);
  }

  function rememberOriginal(node){
    if(!node) return '';
    if(!node.hasAttribute('data-page-original')) node.setAttribute('data-page-original',node.textContent.trim());
    return node.getAttribute('data-page-original')||'';
  }

  function translateVisaValue(value,language){
    if(language==='en') return value;
    var exact={
      ar:{
        'Single Entry':'دخول مفرد',
        'Multiple Entry':'دخول متعدد',
        'Single / Multiple':'دخول مفرد / متعدد',
        'Single/Multiple':'دخول مفرد / متعدد',
        'Flexible stay':'إقامة مرنة',
        'Confirmed after review':'يُؤكد بعد المراجعة'
      },
      fr:{
        'Single Entry':'Entrée simple',
        'Multiple Entry':'Entrées multiples',
        'Single / Multiple':'Entrée simple / multiples',
        'Single/Multiple':'Entrée simple / multiples',
        'Flexible stay':'Séjour flexible',
        'Confirmed after review':'Confirmé après examen'
      },
      es:{
        'Single Entry':'Entrada única',
        'Multiple Entry':'Entradas múltiples',
        'Single / Multiple':'Entrada única / múltiples',
        'Single/Multiple':'Entrada única / múltiples',
        'Flexible stay':'Estancia flexible',
        'Confirmed after review':'Confirmado tras revisión'
      },
      de:{
        'Single Entry':'Einmalige Einreise',
        'Multiple Entry':'Mehrfache Einreise',
        'Single / Multiple':'Einmalig / Mehrfach',
        'Single/Multiple':'Einmalig / Mehrfach',
        'Flexible stay':'Flexibler Aufenthalt',
        'Confirmed after review':'Nach Prüfung bestätigt'
      },
      ru:{
        'Single Entry':'Однократный въезд',
        'Multiple Entry':'Многократный въезд',
        'Single / Multiple':'Однократный / Многократный',
        'Single/Multiple':'Однократный / Многократный',
        'Flexible stay':'Гибкое пребывание',
        'Confirmed after review':'Подтверждается после проверки'
      }
    };
    if(exact[language]&&exact[language][value]) return exact[language][value];
    var match=value.match(/^(\d+)\s+(day|days|hour|hours)$/i);
    if(!match) return value;
    if(language==='ar') return match[1]+' '+(/hour/i.test(match[2])?'ساعة':'يوماً');
    if(language==='fr') return match[1]+' '+(/hour/i.test(match[2])?'heures':'jours');
    if(language==='es') return match[1]+' '+(/hour/i.test(match[2])?'horas':'días');
    if(language==='de') return match[1]+' '+(/hour/i.test(match[2])?'Stunden':'Tage');
    if(language==='ru') return match[1]+' '+(/hour/i.test(match[2])?'ч.':'дн.');
    return value;
  }

  function translateVisaName(value,language){
    if(language==='en') return value;
    if(language==='ar') return value.replace(/Days?/gi,'يوماً').replace(/Tourist Visa/gi,'تأشيرة سياحية').replace(/UAE Visa/gi,'تأشيرة الإمارات');
    if(language==='fr') return value.replace(/Days?/gi,'jours').replace(/Tourist Visa/gi,'Visa touristique').replace(/UAE Visa/gi,'Visa EAU');
    if(language==='es') return value.replace(/Days?/gi,'días').replace(/Tourist Visa/gi,'Visado turístico').replace(/UAE Visa/gi,'Visado EAU');
    if(language==='de') return value.replace(/Days?/gi,'Tage').replace(/Tourist Visa/gi,'Touristenvisum').replace(/UAE Visa/gi,'VAE Visum');
    if(language==='ru') return value.replace(/Days?/gi,'дней').replace(/Tourist Visa/gi,'Туристическая виза').replace(/UAE Visa/gi,'Виза в ОАЭ');
    return value;
  }

  function applyPageLanguage(language){
    var copy=PAGE_COPY[language]||PAGE_COPY.en;
    var main=document.querySelector('main');
    if(!main) return;

    var cName = window.currentCountryName || 'UAE';
    var cSlug = window.currentCountrySlug || 'uae';
    var isUae = cSlug === 'uae' || cSlug === 'united-arab-emirates';

    function cleanText(str) {
      if (isUae || !str) return str;
      var res = str;
      // Replace UAE security clearance first
      res = res.replace(/UAE security clearance/gi, 'visa requirements');
      res = res.replace(/യുഎഇ സുരക്ഷാ ക്ലിയറൻസും/g, 'വിസ ആവശ്യകതകളും');
      res = res.replace(/यूएई सुरक्षा मंजूरी/g, 'वीज़ा आवश्यकताओं');
      // Then replace UAE names
      res = res.replace(/\bUAE\b/gi, cName);
      res = res.replace(/യുഎഇ/g, cName);
      res = res.replace(/यूएई/g, cName);
      return res;
    }

    document.documentElement.lang=language;
    document.documentElement.dir=language==='ar'?'rtl':'ltr';
    main.setAttribute('dir',language==='ar'?'rtl':'ltr');

    // Header nav links
    var topNav=document.querySelectorAll('.site-nav a, .nav-track');
    topNav.forEach(function(node){
      var txt=node.textContent.trim().toLowerCase();
      if(txt==='explore'||txt==='تتبع التأشيرة'||txt==='suivi visa'||txt==='seguimiento') node.textContent=UI_COPY[language]?UI_COPY[language].explore:node.textContent;
    });

    // 1. Navigation tabs
    var navLinks=main.querySelectorAll('.uae-travel-nav-tab, .uae-fresh-nav a');
    navLinks.forEach(function(node,index){
      if(copy.nav[index]) node.textContent=cleanText(copy.nav[index]);
    });

    // 2. Section Headers
    var sectionHeads=main.querySelectorAll('.uae-travel-section-header, .uae-faq-header, .uae-fresh-section-head');
    sectionHeads.forEach(function(section,index){
      var sectionKey=index;
      if(section.id==='visa-info'||section.closest('#visa-info')){
        sectionKey=0;
      }else if(section.closest('#requirements')){
        sectionKey=1;
        if(cSlug === 'denmark' || cSlug === 'spain' || cSlug === 'south-korea' || cSlug === 'switzerland' || cSlug === 'ireland' || cSlug === 'france' || cSlug === 'germany' || cSlug === 'greece' || cSlug === 'azerbaijan' || cSlug === 'china' || cSlug === 'thailand' || cSlug === 'bahrain' || cSlug === 'russia' || cSlug === 'indonesia' || cSlug === 'kenya' || cSlug === 'vietnam' || cSlug === 'morocco' || (cSlug === 'srilanka' || cSlug === 'sri-lanka') || cSlug === 'turkey' || cSlug === 'egypt' || cSlug === 'egypt-2' || cSlug === 'philippines' || cSlug === 'oman' || cSlug === 'saudi-arabia' || cSlug === 'saudi' || cSlug === 'uae' || cSlug === 'united-arab-emirates' || cSlug === 'dubai' || cSlug === 'qatar') return;
      }else if(section.closest('#visa-process')){
        sectionKey=2;
      }else if(section.closest('#visa-benefits')){
        return;
      }
      var values=copy.sections[sectionKey]||PAGE_COPY.en.sections[sectionKey];
      if(!values) return;
      var span=section.querySelector('span');
      var title=section.querySelector('h2');
      var description=section.querySelector('p');
      if(span && values[0]) span.textContent=cleanText(values[0]);
      if(title) title.textContent=cleanText(values[1]);
      if(description && sectionKey !== 0) description.textContent=cleanText(values[2]);
    });

    // 3. Visa Card titles and buttons
    main.querySelectorAll('.uae-visa-v2-title, .uae-fresh-card-heading h3').forEach(function(node){
      node.textContent=translateVisaName(rememberOriginal(node),language);
    });
    main.querySelectorAll('.uae-visa-v2-badge, .uae-fresh-popular').forEach(function(node){
      node.textContent=copy.popular;
    });
    main.querySelectorAll('.uae-visa-v2-btn, .uae-fresh-visa-card>a, .uae-travel-apply-btn').forEach(function(node){
      node.innerHTML=copy.apply+' <span aria-hidden="true">&rarr;</span>';
    });

    var fastestNode = main.querySelector('[data-translate-key="fastestTime"]');
    var avgNode = main.querySelector('[data-translate-key="avgTime"]');
    if (fastestNode) {
      fastestNode.textContent = language === 'ar' ? 'أسرع وقت لتقديم الطلب' :
                               language === 'fr' ? 'DÉLAI DE DEMANDE LE PLUS RAPIDE' :
                               language === 'es' ? 'TIEMPO MÁS RÁPIDO PARA SOLICITAR' :
                               language === 'de' ? 'SCHNELLSTE BEARBEITUNGSZEIT' :
                               language === 'ru' ? 'САМОЕ БЫСТРОЕ ВРЕМЯ ПОДАЧИ' : 'FASTEST TIME TAKEN TO APPLY';
    }
    if (avgNode) {
      avgNode.textContent = language === 'ar' ? 'متوسط وقت التقديم' :
                            language === 'fr' ? 'DÉLAI MOYEN DE DEMANDE' :
                            language === 'es' ? 'TIEMPO PROMEDIO PARA SOLICITAR' :
                            language === 'de' ? 'DURCHSCHNITTLICHE DAUER' :
                            language === 'ru' ? 'СРЕДНЕЕ ВРЕМЯ ПОДАЧИ' : 'AVG. TIME TAKEN TO APPLY';
    }

    // 4. Requirements Accordions
    var hasCustomRequirements = cSlug === 'denmark' || cSlug === 'spain' || cSlug === 'south-korea' || cSlug === 'switzerland' || cSlug === 'ireland' || cSlug === 'france' || cSlug === 'germany' || cSlug === 'greece' || cSlug === 'italy' || cSlug === 'azerbaijan' || cSlug === 'china' || cSlug === 'thailand' || cSlug === 'bahrain' || cSlug === 'russia' || cSlug === 'indonesia' || cSlug === 'kenya' || cSlug === 'vietnam' || cSlug === 'morocco' || (cSlug === 'srilanka' || cSlug === 'sri-lanka') || cSlug === 'turkey' || cSlug === 'egypt' || cSlug === 'egypt-2' || cSlug === 'philippines' || cSlug === 'oman' || cSlug === 'saudi-arabia' || cSlug === 'saudi' || cSlug === 'uae' || cSlug === 'united-arab-emirates' || cSlug === 'dubai' || cSlug === 'qatar';
    if (!hasCustomRequirements) {
      var reqAccordions=main.querySelectorAll('#requirements .uae-travel-accordion, .uae-fresh-requirement-grid article');
      reqAccordions.forEach(function(item,index){
        var values=copy.requirements[index]||PAGE_COPY.en.requirements[index];
        if(!values) return;
        var summary=item.querySelector('.uae-travel-accordion-summary span, h3');
        var body=item.querySelector('.uae-travel-accordion-body p, p');
        if(summary) summary.textContent=cleanText(values[0]);
        if(body) body.textContent=cleanText(values[1]);
      });
    }

    // 5. How It Works / Process Steps
    var stepItems=main.querySelectorAll('.uae-travel-step-item, .uae-fresh-process-grid article');
    stepItems.forEach(function(item,index){
      var values=copy.process[index]||PAGE_COPY.en.process[index];
      if(!values) return;
      var title=item.querySelector('strong, h3');
      var description=item.querySelector('p');
      if(title) title.textContent=cleanText(values[0]);
      if(description) {
        if (index === 2) {
          var lang = language || 'en';
          var daysToAdd = window.selectedVisaDays || 2;
          var d = new Date();
          d.setDate(d.getDate() + daysToAdd);
          var dateStr = d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'short' });
          var cleanTpl = cleanText(values[1]);
          description.innerHTML = cleanTpl.replace('{date}', '<strong data-uae-delivery-date>' + dateStr + '</strong>');
        } else {
          description.textContent=cleanText(values[1]);
        }
      }
    });

    // 6. FAQs
    var faqItems=main.querySelectorAll('#faq .uae-travel-accordion, #faq details, .uae-fresh-faq-list details');
    faqItems.forEach(function(item,index){
      var values=copy.faqs[index]||PAGE_COPY.en.faqs[index];
      if(!values) return;
      var summary=item.querySelector('.uae-travel-accordion-summary span, summary');
      var body=item.querySelector('.uae-travel-accordion-body p, p');
      if(summary) setDirectText(summary,cleanText(values[0]));
      if(body) body.textContent=cleanText(values[1]);
    });

    // 7. Benefits Section
    var benefitsSection = main.querySelector('#visa-benefits');
    if (benefitsSection && copy.benefitsList) {
      var heading = benefitsSection.querySelector('h2');
      if (heading) heading.textContent = cleanText(copy.benefitsList[0][0]);
      var items = benefitsSection.querySelectorAll('.uae-benefit-item');
      items.forEach(function(item, index) {
        var values = copy.benefitsList[index + 1];
        if (values) {
          var title = item.querySelector('strong');
          var desc = item.querySelector('p');
          if (title) title.textContent = cleanText(values[0]);
          if (desc) desc.textContent = cleanText(values[1]);
        }
      });
    }

    // 8. Explore destinations section translation
    var exploreSection = main.querySelector('#explore-destinations');
    if (exploreSection) {
      var expKicker = exploreSection.querySelector('header span');
      var expHeading = exploreSection.querySelector('.dest-editorial-title') || exploreSection.querySelector('header h2');
      var expSeeAll = exploreSection.querySelector('.dest-editorial-see-all span');
      if (expKicker) {
        expKicker.textContent = language === 'ar' ? 'الوجهات' :
                               language === 'fr' ? 'Destinations' :
                               language === 'es' ? 'Destinos' :
                               language === 'de' ? 'Reiseziele' :
                               language === 'ru' ? 'Направления' : 'Destinations';
      }
      if (expHeading) {
        expHeading.textContent = language === 'ar' ? 'الوجهات' :
                                language === 'fr' ? 'Destinations' :
                                language === 'es' ? 'Destinos' :
                                language === 'de' ? 'Reiseziele' :
                                language === 'ru' ? 'Направления' : 'Destinations';
      }
      if (expSeeAll) {
        expSeeAll.textContent = language === 'ar' ? 'عرض الكل' :
                               language === 'fr' ? 'Voir tout' :
                               language === 'es' ? 'Ver todo' :
                               language === 'de' ? 'Alle anzeigen' :
                               language === 'ru' ? 'Смотреть все' : 'See all';
      }
    }
  }

  function applyLanguage(language){
    var copy=UI_COPY[language]||UI_COPY.en;
    applyPageLanguage(language);
    updateFloatingLanguage(language);
    
    var triggerSpan = document.querySelector('.ai-assistant-trigger span');
    if (triggerSpan) triggerSpan.textContent = copy.askAi || 'Chat with us';
    
    var panel=document.querySelector('.ai-assistant-panel');
    if(panel){
      panel.setAttribute('dir',language==='ar'?'rtl':'ltr');
      panel.querySelector('[data-ai-title]').textContent=copy.assistant;
      panel.querySelector('[data-ai-online]').textContent=copy.online;
      panel.querySelector('[data-ai-input]').placeholder=copy.placeholder;
      panel.querySelector('[data-ai-send]').textContent=copy.send;
      
      var waTitle = panel.querySelector('.ai-wa-details h4');
      if(waTitle) waTitle.textContent=copy.waTitle;
      var waDesc = panel.querySelector('.ai-wa-details p');
      if(waDesc) waDesc.textContent=copy.waDesc;
      var waBtn = panel.querySelector('.ai-wa-btn span');
      if(waBtn) waBtn.textContent=copy.waBtn;
    }
  }

  document.addEventListener('visadoo:country-rendered',function(){
    var saved='en';
    try{saved=window.localStorage.getItem('visadoo-language')||'en';}catch(error){}
    applyLanguage(UI_COPY[saved]?saved:'en');
  });

  function initLanguageSelector(){
    var selector=document.getElementById('siteLanguage');
    var saved='en';
    try{saved=window.localStorage.getItem('visadoo-language')||'en';}catch(error){}
    if(selector){
      if(UI_COPY[saved]) selector.value=saved;
      selector.addEventListener('change',function(){
        try{window.localStorage.setItem('visadoo-language',selector.value);}catch(error){}
        applyLanguage(selector.value);
      });
    }
    applyLanguage(UI_COPY[saved]?saved:'en');
  }

  function initAssistant(countryName){
    var old=document.querySelector('.ai-assistant');
    if(old) old.remove();
    applyLanguage(getLanguage());
  }

  function ensureCountryWhatsApp(countryName){
    var links=document.querySelectorAll('.wa-float, .ai-wa-btn');
    var number=String((window.VISADOO_CONFIG&&window.VISADOO_CONFIG.WHATSAPP)||'919895226697').replace(/[^0-9]/g,'');
    var text=encodeURIComponent('Hi Visa Doo, I have a question about a '+countryName+' visa.');
    
    links.forEach(function(link) {
      link.href='https://wa.me/'+number+'?text='+text;
      
      if (link.classList.contains('wa-float')) {
        var label=link.querySelector('.wa-label');
        if(!label){
          label=document.createElement('span');
          label.className='wa-label';
          link.appendChild(label);
        }
        label.textContent='Chat';
        link.classList.add('has-label');
      }
    });

    if (links.length === 0) {
      var link=document.createElement('a');
      link.className='wa-float';
      link.id='waFloat';
      link.target='_blank';
      link.rel='noopener';
      link.setAttribute('aria-label','Chat with our visa team on WhatsApp');
      link.innerHTML='<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.66 4.84 1.82 6.84L3 29l6.66-2.08a12.6 12.6 0 0 0 6.34 1.62h.01c7 0 12.69-5.7 12.69-12.69C28.7 8.7 23 3 16 3zm0 23.07h-.01a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.95 1.04 1.05-3.85-.25-.4a10.39 10.39 0 0 1-1.59-5.53c0-5.74 4.68-10.42 10.43-10.42 2.78 0 5.4 1.09 7.37 3.06a10.36 10.36 0 0 1 3.05 7.37c0 5.75-4.68 10.43-10.42 10.43zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-1 1.23-.18.21-.37.23-.68.08-.31-.16-1.32-.49-2.52-1.55-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55l-.61-.01c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.76.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37z"/></svg>';
      link.href='https://wa.me/'+number+'?text='+text;
      var label=document.createElement('span');
      label.className='wa-label';
      label.textContent='Chat';
      link.appendChild(label);
      link.classList.add('has-label');
      document.body.appendChild(link);
    }
  }

  function initFreshSectionNav(){
    var nav=document.querySelector('.uae-fresh-nav');
    if(!nav||nav.getAttribute('data-ready')==='true') return;
    nav.setAttribute('data-ready','true');
    var links=Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var items=links.map(function(link){return {link:link,section:document.querySelector(link.getAttribute('href'))};}).filter(function(item){return !!item.section;});
    function update(){
      if(!items.length) return;
      var marker=nav.getBoundingClientRect().bottom+36;
      var active=items[0];
      items.forEach(function(item){if(item.section.getBoundingClientRect().top<=marker) active=item;});
      items.forEach(function(item){
        var selected=item===active;
        item.link.classList.toggle('active',selected);
        if(selected) item.link.setAttribute('aria-current','location');
        else item.link.removeAttribute('aria-current');
      });
    }
    var queued=false;
    function schedule(){
      if(queued) return;
      queued=true;
      window.requestAnimationFrame(function(){queued=false;update();});
    }
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    update();
  }

  function initTravellerSelector(){
    if(!document.body.classList.contains('uae-country-page')||document.body.getAttribute('data-traveller-picker-ready')==='true') return;
    document.body.setAttribute('data-traveller-picker-ready','true');
    var picker=document.createElement('div');
    picker.className='traveller-picker';
    picker.hidden=true;
    picker.innerHTML='<div class="traveller-picker-backdrop" data-traveller-close></div>'+ 
      '<section class="traveller-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="travellerPickerTitle">'+ 
        '<button type="button" class="traveller-picker-close" data-traveller-close aria-label="Close">&#215;</button>'+ 
        
        '<h2 id="travellerPickerTitle">Select Date &amp; Choose Travellers</h2>'+
        '<p class="traveller-picker-visa" id="travellerPickerVisa" style="display:none;"></p>'+
        
        '<!-- Subheading 1 & Calendar -->'+
        '<div class="modal-calendar-section">'+
          '<span class="modal-calendar-title">Arrival Date to United Arab Emirates</span>'+
          '<div class="modal-calendar-wrapper">'+
            '<div id="modalCalendarContainer" class="modal-calendar-widget"></div>'+
            '<input type="hidden" id="travellerOnwardDate" data-traveller-onward required>'+
          '</div>'+
        '</div>'+

        '<!-- Subheading 2 & Travellers Choice -->'+
        '<div class="modal-travellers-section">'+
          '<span class="modal-travellers-title">How many people are travelling?</span>'+
          
          '<!-- Single / Multiple buttons -->'+
          '<div class="traveller-picker-options">'+
            '<button type="button" data-traveller-mode="single"><i>1</i><span><b>Single person</b><small>One traveller</small></span></button>'+
            '<button type="button" data-traveller-mode="multiple"><i>+</i><span><b>Multiple persons</b><small>Family or group</small></span></button>'+
          '</div>'+

          '<!-- Multiple scroll dropdown -->'+
          '<div class="traveller-picker-count" id="travellerPickerCount" hidden>'+
            '<label for="travellerCount">NUMBER OF PERSONS</label>'+
            '<select id="travellerCount">'+
              '<option value="2">2 travellers</option>'+
              '<option value="3">3 travellers</option>'+
              '<option value="4">4 travellers</option>'+
              '<option value="5">5 travellers</option>'+
              '<option value="6">6 travellers</option>'+
              '<option value="7">7 travellers</option>'+
              '<option value="8">8 travellers</option>'+
              '<option value="9">9 travellers</option>'+
              '<option value="10">10 travellers</option>'+
            '</select>'+
          '</div>'+

          '<!-- Traveller Names & Relationships Details -->'+
          '<div class="traveller-picker-details" id="travellerPickerDetails" hidden></div>'+
        '</div>'+

        '<!-- Fee Summary Box -->'+
        '<div class="traveller-picker-price-summary" id="travellerPickerPriceSummary" hidden style="margin-top:16px;padding:12px 16px;background:#f0f5ff;border:1px solid #c8d7e1;border-radius:12px;display:flex;justify-content:space-between;align-items:center;">'+
          '<span style="font-size:13px;font-weight:700;color:#1e3a8a;">Total Visa Fee</span>'+
          '<div style="text-align:right;">'+
            '<strong id="travellerPickerTotalPrice" style="display:block;font-size:18px;font-weight:850;color:#2563eb;">₹0</strong>'+
            '<small id="travellerPickerPriceBreakdown" style="font-size:11px;color:#64748b;font-weight:600;"></small>'+
          '</div>'+
        '</div>'+

        '<!-- Continue button -->'+
        '<button type="button" class="traveller-picker-continue" id="travellerPickerContinue" disabled style="margin-top:10px;">Continue to application <span aria-hidden="true">&#8594;</span></button>'+
      '</section>';
    document.body.appendChild(picker);
    var pendingHref='';
    var selectedMode='';
    var countWrap=picker.querySelector('#travellerPickerCount');
    var countSelect=picker.querySelector('#travellerCount');
    var onwardInput=picker.querySelector('#travellerOnwardDate');
    var detailsWrap=picker.querySelector('#travellerPickerDetails');
    var continueButton=picker.querySelector('#travellerPickerContinue');
    var visaLabel=picker.querySelector('#travellerPickerVisa');
    var modeButtons=Array.prototype.slice.call(picker.querySelectorAll('[data-traveller-mode]'));
    var opener=null;
    var relationships=['Spouse','Child','Parent','Sibling','Relative','Friend','Colleague','Other'];

    var calMonth = new Date().getMonth();
    var calYear = new Date().getFullYear();
    var selectedDateStr = '';

    function getFormattedDate(d){
      var yyyy=d.getFullYear();
      var mm=String(d.getMonth()+1).padStart(2,'0');
      var dd=String(d.getDate()).padStart(2,'0');
      return yyyy+'-'+mm+'-'+dd;
    }

    function renderModalCalendar() {
      var container = picker.querySelector('#modalCalendarContainer');
      if(!container) return;

      var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      var firstDayIndex = new Date(calYear, calMonth, 1).getDay();
      
      var now = new Date();
      var todayDate = now.getDate();
      var todayMonth = now.getMonth();
      var todayYear = now.getFullYear();

      var html = '<div class="modal-cal-header">' +
        '<button type="button" class="modal-cal-nav-btn" id="modalCalPrevMonth">&lt;</button>' +
        '<strong>' + monthNames[calMonth] + ' ' + calYear + '</strong>' +
        '<button type="button" class="modal-cal-nav-btn" id="modalCalNextMonth">&gt;</button>' +
      '</div>' +
      '<div class="modal-cal-weekdays">' +
        '<span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>' +
      '</div>' +
      '<div class="modal-cal-days">';

      for (var i = 0; i < firstDayIndex; i++) {
        html += '<span class="modal-cal-day empty"></span>';
      }

      for (var day = 1; day <= daysInMonth; day++) {
        var dayDate = new Date(calYear, calMonth, day);
        var dayDateStr = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        
        var isPast = false;
        var compToday = new Date(todayYear, todayMonth, todayDate);
        if (dayDate < compToday) {
          isPast = true;
        }

        var isSelected = (dayDateStr === selectedDateStr);
        var classes = ['modal-cal-day'];
        if (isPast) classes.push('disabled');
        if (isSelected) classes.push('selected');
        if (dayDate.getTime() === compToday.getTime()) classes.push('today');

        html += '<span class="' + classes.join(' ') + '" data-date="' + dayDateStr + '">' + day + '</span>';
      }

      html += '</div>';
      container.innerHTML = html;

      var prevBtn = picker.querySelector('#modalCalPrevMonth');
      var nextBtn = picker.querySelector('#modalCalNextMonth');
      if (prevBtn) {
        prevBtn.onclick = function(e) {
          e.stopPropagation();
          var minDate = new Date(todayYear, todayMonth, 1);
          var checkDate = new Date(calYear, calMonth - 1, 1);
          if (checkDate >= minDate) {
            calMonth--;
            if (calMonth < 0) {
              calMonth = 11;
              calYear--;
            }
            renderModalCalendar();
          }
        };
      }
      if (nextBtn) {
        nextBtn.onclick = function(e) {
          e.stopPropagation();
          calMonth++;
          if (calMonth > 11) {
            calMonth = 0;
            calYear++;
          }
          renderModalCalendar();
        };
      }

      var dayButtons = container.querySelectorAll('.modal-cal-day:not(.empty):not(.disabled)');
      dayButtons.forEach(function(btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          selectedDateStr = btn.getAttribute('data-date');
          onwardInput.value = selectedDateStr;
          renderModalCalendar();
          validateForm();
        };
      });
    }

    function relationshipOptions(){
      return '<option value="" disabled selected hidden>Select relationship</option>'+relationships.map(function(label){return '<option value="'+label+'">'+label+'</option>';}).join('');
    }

    function renderTravellerDetails(){
      if(!selectedMode || selectedMode === 'single'){
        detailsWrap.hidden = true;
        detailsWrap.innerHTML = '';
        updatePickerFeeSummary();
        validateForm();
        return;
      }

      var total = Math.max(2, Number(countSelect.value) || 2);
      var rows = ['<div style="font-size:12px;font-weight:750;color:#0d2538;margin-bottom:8px;margin-top:10px;">Enter Traveller Details</div>'];
      
      // Traveller 1: Self
      rows.push('<div class="traveller-person-row traveller-person-self">' +
        '<span>1</span>' +
        '<div class="traveller-person-fields">' +
          '<label for="travellerName0">Your name</label>' +
          '<input id="travellerName0" data-traveller-name="0" type="text" autocomplete="name" maxlength="100" placeholder="Enter your full name" required>' +
        '</div>' +
      '</div>');

      // Subsequent Travellers: Name & Relation
      for(var index = 1; index < total; index++){
        rows.push('<div class="traveller-person-row">' +
          '<span>' + (index + 1) + '</span>' +
          '<div class="traveller-person-fields">' +
            '<label for="travellerName' + index + '">Traveller ' + (index + 1) + ' name</label>' +
            '<input id="travellerName' + index + '" data-traveller-name="' + index + '" type="text" maxlength="100" placeholder="Enter full name" required>' +
          '</div>' +
          '<div class="traveller-person-fields">' +
            '<label for="travellerRelation' + index + '">Relationship</label>' +
            '<select id="travellerRelation' + index + '" data-traveller-relation="' + index + '" required>' +
              relationshipOptions() +
            '</select>' +
          '</div>' +
        '</div>');
      }

      detailsWrap.innerHTML = rows.join('');
      detailsWrap.hidden = false;
      
      detailsWrap.querySelectorAll('input, select').forEach(function(el) {
        el.addEventListener('input', validateForm);
        el.addEventListener('change', validateForm);
      });

      updatePickerFeeSummary();
      validateForm();
    }

    function chooseMode(mode){
      selectedMode=mode;
      modeButtons.forEach(function(button){button.classList.toggle('selected',button.getAttribute('data-traveller-mode')===mode);});
      countWrap.hidden=mode!=='multiple';
      renderTravellerDetails();
      if(mode==='multiple') window.requestAnimationFrame(renderTravellerDetails);
    }
    modeButtons.forEach(function(button){button.addEventListener('click',function(){chooseMode(button.getAttribute('data-traveller-mode'));});});
    countSelect.addEventListener('change',renderTravellerDetails);
    countSelect.addEventListener('input',renderTravellerDetails);

    function updatePickerFeeSummary(){
      var summaryWrap=picker.querySelector('#travellerPickerPriceSummary');
      var priceEl=picker.querySelector('#travellerPickerTotalPrice');
      var breakdownEl=picker.querySelector('#travellerPickerPriceBreakdown');
      if(!summaryWrap||!priceEl||!selectedMode) return;
      var total=selectedMode==='multiple'?Math.max(2,Number(countSelect.value)||2):1;
      
      var visaSlug='';
      if(pendingHref){
        var match=pendingHref.match(/visa=([^&]+)/);
        if(match) visaSlug=decodeURIComponent(match[1]);
      }
      var unitPrice=0;
      if(visaSlug){
        var input=document.querySelector('input[name="visa"][value="'+visaSlug+'"]');
        if(input) unitPrice=Number(input.getAttribute('data-raw-price')||0);
      }
      if(!unitPrice){
        var checked=document.querySelector('[data-uae-visa-selector] input[name="visa"]:checked');
        if(checked) unitPrice=Number(checked.getAttribute('data-raw-price')||0);
      }
      if(unitPrice>0){
        var totalFee=unitPrice*total;
        var moneyStr='₹'+totalFee.toLocaleString('en-IN');
        var unitMoneyStr='₹'+unitPrice.toLocaleString('en-IN');
        priceEl.textContent=moneyStr;
        if(total>1){
          breakdownEl.textContent='('+unitMoneyStr+' × '+total+' persons)';
          breakdownEl.hidden=false;
        }else{
          breakdownEl.textContent='';
          breakdownEl.hidden=true;
        }
        summaryWrap.hidden=false;
      }else{
        summaryWrap.hidden=true;
      }
    }

    function validateForm(){
      var isValid = true;
      if(!onwardInput.value) {
        isValid = false;
      }
      if(!selectedMode) {
        isValid = false;
      }
      if(selectedMode === 'multiple') {
        var total = Math.max(2, Number(countSelect.value) || 2);
        if(detailsWrap) {
          for(var index = 0; index < total; index++) {
            var nameInput = detailsWrap.querySelector('[data-traveller-name="' + index + '"]');
            if(!nameInput || !nameInput.value.trim()) {
              isValid = false;
              break;
            }
            var relationInput = index === 0 ? null : detailsWrap.querySelector('[data-traveller-relation="' + index + '"]');
            if(relationInput && !relationInput.value) {
              isValid = false;
              break;
            }
          }
        }
      }
      continueButton.disabled = !isValid;
    }

    function openPicker(link){
      opener=link;
      pendingHref=link.href;
      selectedMode='';
      countSelect.value='2';
      countWrap.hidden=true;
      detailsWrap.hidden=true;
      detailsWrap.innerHTML='';

      selectedDateStr = '';
      onwardInput.value = '';

      calMonth = new Date().getMonth();
      calYear = new Date().getFullYear();
      renderModalCalendar();

      continueButton.disabled=true;
      modeButtons.forEach(function(button){button.classList.remove('selected');});
      var card=link.closest('article');
      var title=card&&card.querySelector('h3');
      visaLabel.textContent=title?title.textContent.trim():'';
      
      var calendarTitle = picker.querySelector('.modal-calendar-title');
      if (calendarTitle) {
        var countryName = window.currentCountryName || 'United Arab Emirates';
        calendarTitle.textContent = 'Arrival Date to ' + countryName;
      }

      picker.hidden=false;
      document.body.classList.add('traveller-picker-open');

      var pagePersonsSelect=document.querySelector('[data-uae-persons-select]');
      var initialPersons=pagePersonsSelect?Math.max(1,parseInt(pagePersonsSelect.value,10)||1):1;
      if(initialPersons>1){
        countSelect.value=String(initialPersons);
        chooseMode('multiple');
      }else{
        chooseMode('single');
      }
    }
    function closePicker(){
      picker.hidden=true;
      document.body.classList.remove('traveller-picker-open');
      if(opener) opener.focus({preventScroll:true});
    }
    picker.querySelectorAll('[data-traveller-close]').forEach(function(button){button.addEventListener('click',closePicker);});

    function startApplicationOnSamePage() {
      var mainPage = document.getElementById('countryPage');
      if (mainPage) mainPage.style.display = 'none';
      
      var footer = document.querySelector('footer');
      if (footer) footer.style.display = 'none';

      var navLinks = document.getElementById('navLinks');
      if (navLinks) navLinks.hidden = true;

      var brandLink = document.querySelector('.discover-header .brand');
      if (brandLink) {
        brandLink.href = window.location.pathname + '?slug=united-arab-emirates';
      }

      var fl = document.querySelector('.site-language--floating');
      if (fl) fl.style.display = 'none';

      document.body.classList.remove('country-page', 'uae-country-page');
      document.body.classList.add('apply-focus', 'two-step-application');

      var appRoot = document.getElementById('appRoot');
      if (!appRoot) {
        appRoot = document.createElement('div');
        appRoot.id = 'appRoot';
        document.body.appendChild(appRoot);
      }
      appRoot.style.display = 'block';

      var toastEl = document.getElementById('toast');
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'toast';
        toastEl.id = 'toast';
        document.body.appendChild(toastEl);
      }

      var navContainer = document.querySelector('.discover-header .container.nav');
      if (navContainer) {
        var staticActions = navContainer.querySelector('.nav-actions:not(#headerActions)');
        if (staticActions) staticActions.style.display = 'none';

        var headerActions = document.getElementById('headerActions');
        if (!headerActions) {
          headerActions = document.createElement('div');
          headerActions.className = 'nav-actions';
          headerActions.id = 'headerActions';
          navContainer.appendChild(headerActions);
        }
        headerActions.style.display = 'flex';
      }

      if (!document.querySelector('link[href*="app.css"]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/app.css?v=20260807-clean-document-model';
        document.head.appendChild(link);
      }
      if (!document.querySelector('link[href*="intlTelInput"]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/vendor/intlTelInput.css';
        document.head.appendChild(link);
      }

      function loadScript(src) {
        return new Promise(function(resolve, reject) {
          var s = document.createElement('script');
          s.src = src;
          s.onload = resolve;
          s.onerror = reject;
          document.body.appendChild(s);
        });
      }

      var loadIT = window.intlTelInput ? Promise.resolve() : loadScript('/vendor/intlTelInput.min.js');
      var loadChart = window.Chart ? Promise.resolve() : loadScript('/vendor/chart.umd.min.js');
      var loadTess = window.Tesseract ? Promise.resolve() : loadScript('/vendor/tesseract.min.js');

      Promise.all([loadIT, loadChart, loadTess]).then(function() {
        if (!document.querySelector('script[src*="application.js"]')) {
          loadScript('/application.js?v=20260807-clean-review-model').catch(function(err){
            console.error('Failed to load application.js', err);
          });
        } else {
          if (window.location.hash) {
            window.dispatchEvent(new Event('hashchange'));
          } else {
            window.location.reload();
          }
        }
      }).catch(function(err) {
        console.error('Error loading dependencies', err);
      });
    }

    document.addEventListener('visadoo:country-rendered', function() {
      var params = new URLSearchParams(window.location.search);
      var visaId = params.get('visa');
      var hash = window.location.hash || '';
      var hasAppHash = ['#track', '#profile', '#apply', '#dashboard', '#admin'].indexOf(hash) > -1 || hash.indexOf('#appview/') === 0 || hash.indexOf('#custview/') === 0 || hash.indexOf('#supview/') === 0 || hash.indexOf('#leadview/') === 0;

      if ((visaId || hasAppHash) && document.body.classList.contains('uae-country-page')) {
        var p = document.querySelector('.traveller-picker');
        if (p) p.hidden = true;
        document.body.classList.remove('traveller-picker-open');
        startApplicationOnSamePage();
      }
    });

    document.addEventListener('click', function(event) {
      var staticLink = event.target.closest && event.target.closest('a.nav-track, a.nav-profile');
      if (!staticLink || !document.body.classList.contains('uae-country-page')) return;
      
      event.preventDefault();
      var href = staticLink.getAttribute('href') || '';
      var hashMatch = href.match(/#(.*)$/);
      var hash = hashMatch ? '#' + hashMatch[1] : '';
      if (hash) {
        window.location.hash = hash;
        startApplicationOnSamePage();
      }
    });

    continueButton.addEventListener('click',function(){
      if(!pendingHref) return;

      var todayStr=getFormattedDate(new Date());
      if(!onwardInput.value||onwardInput.value<todayStr){
        return;
      }

      var travellers=selectedMode==='multiple'?Math.max(2,Number(countSelect.value)||2):1;
      var people=[];
      if(selectedMode === 'multiple') {
        for(var index=0;index<travellers;index++){
          var nameInput=detailsWrap.querySelector('[data-traveller-name="'+index+'"]');
          var relationInput=index===0?null:detailsWrap.querySelector('[data-traveller-relation="'+index+'"]');
          people.push({name:nameInput.value,relation:index===0?'Self':relationInput.value});
        }
      } else if(selectedMode === 'single') {
        people.push({name:'',relation:'Self'});
      }
      
      var destination=new URL(pendingHref,window.location.href);
      var visaId = destination.searchParams.get('visa') || '30-days-tourist-visa';
      
      var newUrl = new URL(window.location.href);
      newUrl.searchParams.set('visa', visaId);
      newUrl.searchParams.set('travellers', String(travellers));
      newUrl.searchParams.set('group', selectedMode);
      newUrl.searchParams.set('onwardDate', onwardInput.value);
      newUrl.searchParams.set('arrivalDate', onwardInput.value);
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search + newUrl.hash);

      try{window.sessionStorage.setItem('visadoo-traveller-draft',JSON.stringify({visa:visaId,mode:selectedMode,count:travellers,onwardDate:onwardInput.value,arrivalDate:onwardInput.value,travellers:people}));}catch(error){}
      
      closePicker();
      startApplicationOnSamePage();
    });
    function bypassPickerAndStartApp(link) {
      var href = link.getAttribute ? link.getAttribute('href') : link.href;
      if (!href) return;

      var pagePersonsSelect = document.querySelector('[data-uae-persons-select]');
      var travellers = pagePersonsSelect ? Math.max(1, parseInt(pagePersonsSelect.value, 10) || 1) : 1;
      var selectedMode = travellers > 1 ? 'multiple' : 'single';
      
      var people = [];
      if (selectedMode === 'multiple') {
        for (var index = 0; index < travellers; index++) {
          people.push({ name: '', relation: index === 0 ? 'Self' : 'Other' });
        }
      } else {
        people.push({ name: '', relation: 'Self' });
      }

      var destination = new URL(href, window.location.href);
      var visaId = destination.searchParams.get('visa');
      if (!visaId) {
        var form = document.querySelector('[data-uae-visa-selector]');
        if (form) {
          var checked = form.querySelector('input[name="visa"]:checked');
          if (checked) visaId = checked.value;
          else {
            var firstInput = form.querySelector('input[name="visa"]');
            if (firstInput) visaId = firstInput.value;
          }
        }
      }
      if (!visaId) visaId = '30-days-tourist-visa';

      var defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14); // 2 weeks in future
      var onwardDateStr = getFormattedDate(defaultDate);

      var newUrl = new URL(window.location.href);
      newUrl.searchParams.set('visa', visaId);
      newUrl.searchParams.set('travellers', String(travellers));
      newUrl.searchParams.set('group', selectedMode);
      newUrl.searchParams.set('onwardDate', onwardDateStr);
      newUrl.searchParams.set('arrivalDate', onwardDateStr);
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search + newUrl.hash);

      try {
        window.sessionStorage.setItem('visadoo-traveller-draft', JSON.stringify({
          visa: visaId,
          mode: selectedMode,
          count: travellers,
          onwardDate: onwardDateStr,
          arrivalDate: onwardDateStr,
          travellers: people
        }));
      } catch (error) {}

      startApplicationOnSamePage();
    }

    document.addEventListener('click',function(event){
      var link=event.target.closest&&event.target.closest('a[href*="app.html?visa="], .uae-picker-submit, [data-uae-visa-selector] button[type="submit"]');
      if(!link||!document.body.classList.contains('uae-country-page')) return;
      // Direct redirect destinations (Kenya, Azerbaijan eVisa, Sri Lanka, Vietnam, Indonesia, Morocco, Thailand, Bahrain, etc.)
      // have dedicated Apply Now -> Photo -> Passport -> Details flow in country-page.js.
      // Do not intercept their buttons or show calendar modal here.
      var curSlug = (window.currentCountrySlug || '').toLowerCase();
      var baseSlug = curSlug.replace(/-\d+$/, '');
      var isDirectApply = curSlug === 'kenya' || curSlug === 'azerbaijan-2' || curSlug === 'srilanka' || curSlug === 'sri-lanka' || curSlug === 'vietnam' || curSlug === 'indonesia' || curSlug === 'morocco' || curSlug === 'thailand' || curSlug === 'bahrain' || curSlug === 'turkey' || curSlug === 'russia' || curSlug === 'uae' || curSlug === 'united-arab-emirates' || curSlug === 'qatar' || curSlug === 'egypt' || curSlug === 'egypt-2' || curSlug === 'philippines' || curSlug === 'oman' || curSlug === 'saudi-arabia' || curSlug === 'saudi';
      if (isDirectApply) return;
      event.preventDefault();
      
      var form=document.querySelector('[data-uae-visa-selector]');
      var visaSlug='';
      if(form){
        var checked=form.querySelector('input[name="visa"]:checked');
        if(checked) visaSlug=checked.value;
      }
      if(!visaSlug && link.getAttribute && link.getAttribute('href')){
        var match=(link.getAttribute('href')||'').match(/visa=([^&]+)/);
        if(match) visaSlug=decodeURIComponent(match[1]);
      }
      
      var targetLink=document.createElement('a');
      targetLink.href='/app.html?visa='+(visaSlug||'30-days-tourist-visa');
      var bypassList = ['denmark','spain','south-korea','switzerland','ireland','france','germany','greece','azerbaijan','azerbaijan-2','china','thailand','bahrain','russia','indonesia','kenya','vietnam','morocco','srilanka','sri-lanka','turkey','uae','united-arab-emirates','qatar','egypt','egypt-2','philippines','oman','saudi-arabia','saudi'];
      if (bypassList.indexOf(curSlug) > -1 || bypassList.indexOf(baseSlug) > -1) {
        bypassPickerAndStartApp(targetLink);
      } else {
        openPicker(targetLink);
      }
    });

    document.addEventListener('submit',function(event){
      var form=event.target.closest&&event.target.closest('[data-uae-visa-selector]');
      if(!form||!document.body.classList.contains('uae-country-page')) return;
      var curSlug = (window.currentCountrySlug || '').toLowerCase();
      var baseSlug = curSlug.replace(/-\d+$/, '');
      var isDirectApply = curSlug === 'kenya' || curSlug === 'azerbaijan-2' || curSlug === 'srilanka' || curSlug === 'sri-lanka' || curSlug === 'vietnam' || curSlug === 'indonesia' || curSlug === 'morocco' || curSlug === 'thailand' || curSlug === 'bahrain' || curSlug === 'turkey' || curSlug === 'russia' || curSlug === 'uae' || curSlug === 'united-arab-emirates' || curSlug === 'qatar' || curSlug === 'egypt' || curSlug === 'egypt-2' || curSlug === 'philippines' || curSlug === 'oman' || curSlug === 'saudi-arabia' || curSlug === 'saudi';
      if (isDirectApply) return;
      event.preventDefault();

      var checked=form.querySelector('input[name="visa"]:checked');
      var visaSlug=checked?checked.value:'30-days-tourist-visa';
      var targetLink=document.createElement('a');
      targetLink.href='/app.html?visa='+encodeURIComponent(visaSlug);
      var bypassList = ['denmark','spain','south-korea','switzerland','ireland','france','germany','greece','azerbaijan','azerbaijan-2','china','thailand','bahrain','russia','indonesia','kenya','vietnam','morocco','srilanka','sri-lanka','turkey','uae','united-arab-emirates','qatar','egypt','egypt-2','philippines','oman','saudi-arabia','saudi'];
      if (bypassList.indexOf(curSlug) > -1 || bypassList.indexOf(baseSlug) > -1) {
        bypassPickerAndStartApp(targetLink);
      } else {
        openPicker(targetLink);
      }
    });

    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!picker.hidden) closePicker();});
  }

  function initFloatingLanguage(){
    var container = document.querySelector('.site-language-header-selector');
    if (!container) return;
    var trigger = container.querySelector('.site-language-trigger');
    var menu = container.querySelector('.site-language-menu');
    if (!trigger || !menu) return;

    var selector = document.getElementById('siteLanguage');

    function openMenu() {
      menu.style.display = 'flex';
      trigger.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      menu.style.display = 'none';
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function(event) {
      event.stopPropagation();
      var isOpen = menu.style.display === 'flex';
      if (isOpen) closeMenu();
      else openMenu();
    });

    document.addEventListener('click', function() {
      closeMenu();
    });

    menu.addEventListener('click', function(event) {
      event.stopPropagation();
    });

    container.querySelectorAll('[data-language-option]').forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.stopPropagation();
        var code = button.getAttribute('data-language-option');
        if (typeof window.visadooSetLanguage === 'function') {
          window.visadooSetLanguage(code);
        } else {
          try { window.localStorage.setItem('visadoo-language', code); } catch(error) {}
          if (selector) {
            selector.value = code;
            selector.dispatchEvent(new Event('change', { bubbles: true }));
          }
          applyLanguage(code);
        }
        closeMenu();
      });
    });

    var saved = 'en';
    try { saved = window.localStorage.getItem('visadoo-language') || 'en'; } catch(error) {}
    applyLanguage(UI_COPY[saved] ? saved : 'en');
  }

  initLanguageSelector();
  window.VisaDooCountryExperience={
    initAssistant:function(countryName){
      initAssistant(countryName);
      ensureCountryWhatsApp(countryName);
      initFreshSectionNav();
      initFloatingLanguage();
      initTravellerSelector();
    },
    applyLanguage:applyLanguage
  };
})();
