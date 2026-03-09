import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';

interface LegalModalsProps {
    type: 'legal' | 'privacy' | 'cookies' | 'terms' | null;
    language: Language;
    onClose: () => void;
}

export const LegalModals: React.FC<LegalModalsProps> = ({ type, language, onClose }) => {
    const { data: settings } = useSupabaseData('system_settings');
    const [companyInfo, setCompanyInfo] = useState({
        name: 'Palladium Transfers S.L.',
        nif: '[Pendiente de completar]',
        address: '[Pendiente de completar]',
        email: 'info@palladiumtransfers.com'
    });

    useEffect(() => {
        if (settings) {
            const info = { ...companyInfo };
            settings.forEach((s: any) => {
                if (s.key === 'company_name' && s.value) info.name = s.value;
                if (s.key === 'company_nif' && s.value) info.nif = s.value;
                if (s.key === 'company_address' && s.value) info.address = s.value;
                if (s.key === 'email_sender' && s.value) info.email = s.value;
            });
            setCompanyInfo(info);
        }
    }, [settings]);

    if (!type) return null;

    const content = {
        es: {
            legal: {
                title: 'Aviso Legal',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <p>En cumplimiento con el deber de información recogido en artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), a continuación se hacen constar los siguientes datos identificativos:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Titular de la web:</strong> {companyInfo.name}</li>
                            <li><strong>NIF:</strong> {companyInfo.nif}</li>
                            <li><strong>Domicilio Social:</strong> {companyInfo.address}</li>
                            <li><strong>Correo electrónico de contacto:</strong> {companyInfo.email}</li>
                            <li><strong>Actividad principal:</strong> Servicios de transporte privado y traslado (VTC).</li>
                        </ul>
                        <h3 className="text-white font-bold mt-6 mb-2">Propiedad Intelectual e Industrial</h3>
                        <p>Los derechos de propiedad intelectual de la página web, su código fuente, diseño, estructuras de navegación y los distintos elementos en ella contenidos son titularidad de {companyInfo.name}, a quien corresponde el ejercicio exclusivo de los derechos de explotación de los mismos.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Condiciones de Uso</h3>
                        <p>El usuario de la web se compromete a hacer un uso adecuado y lícito del sitio web y de sus contenidos, de conformidad con la Legislación aplicable y el presente Aviso Legal.</p>
                    </div>
                )
            },
            privacy: {
                title: 'Política de Privacidad',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <p>En {companyInfo.name} nos tomamos muy en serio la protección de sus datos personales. Esta Política de Privacidad describe cómo recogemos, usamos y protegemos sus datos, de acuerdo con el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Responsable del Tratamiento</h3>
                        <p>Identidad: {companyInfo.name} | Email: {companyInfo.email}</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Finalidad</h3>
                        <p>Tus datos se recopilan exclusivamente para: gestionar las reservas de servicios de traslado, contactar en caso de incidencias con el servicio o facturación, y garantizar su correcta prestación.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Legitimación</h3>
                        <p>La base legal para el tratamiento de sus datos es la ejecución del contrato de prestación de servicios (reserva) y el consentimiento expreso del usuario al rellenar el formulario de reserva.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Destinatarios</h3>
                        <p>No se cederán datos a terceros salvo obligación legal. Los datos correspondientes de recogida y destino son compartidos únicamente con el conductor asignado para poder llevar a cabo el servicio.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Derechos (ARCO+)</h3>
                        <p>Cualquier persona tiene derecho a solicitar el acceso, rectificación, supresión, limitación y oposición del tratamiento de sus datos, enviando un correo a {companyInfo.email} adjuntando copia de su DNI o documento equivalente.</p>
                    </div>
                )
            },
            cookies: {
                title: 'Política de Cookies',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <p>Esta web utiliza cookies imprescindibles para el correcto funcionamiento tecnológico de la plataforma. De conformidad con la normativa española (LSSI-CE), le informamos sobre el uso de cookies en nuestro sistema.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">¿Qué son las cookies?</h3>
                        <p>Las cookies son pequeños archivos de texto que se instalan y almacenan en el navegador cuando se visitan páginas web. Su fin principal es recordar detalles de la visita.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">¿Piden permiso para instalar cookies?</h3>
                        <p>Nuestra web <strong>NO utiliza cookies de análisis o marketing (tracking) de terceros</strong> (como Google Analytics, Meta Pixel, etc.) que requieran de consentimiento explícito.</p>
                        <p>Únicamente utilizamos cookies <strong>TÉCNICAS O ESTRICTAMENTE NECESARIAS</strong>. Éstas permiten mantener el estado de la sesión (por ejemplo, acceder al portal de administración), evitar ataques CSRF y recordar la preferencia de idioma del navegador. Al ser imprescindibles, están exentas de la obligación de obtener el consentimiento del usuario.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Cómo desactivar las cookies</h3>
                        <p>Puede usted restringir, bloquear o borrar las cookies de nuestro sitio o de cualquier otra página web utilizando su navegador. Sin embargo, advertimos que al desactivar estas cookies de sesión, el portal de clientes y empleados podría dejar de operar correctamente.</p>
                    </div>
                )
            },
            terms: {
                title: 'Términos y Condiciones',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <p>Las presentes Condiciones Generales de Venta rigen la compra de servicios de traslado de {companyInfo.name} a través del sitio web.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">1. Reservas y Confirmación</h3>
                        <p>Todas las reservas deben realizarse con la debida antelación. La reserva no se considerará "confirmada" hasta que el sistema emita un comprobante o voucher (PDF/Email) y el pago, si corresponde por adelantado, haya sido debidamente procesado.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">2. Política de Espera (Retrasos)</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Recogidas en Aeropuerto:</strong> Se concede un margen de cortesía de hasta 30 minutos desde la hora programada de aterrizaje del vuelo. Monitoreamos los tiempos reales.</li>
                            <li><strong>Recogidas en Ciudad/Hotel:</strong> El tiempo de espera o cortesía será de 15 minutos máximo desde la hora acordada.</li>
                        </ul>
                        <p>Superados estos tiempos sin localizar al cliente (No-Show), el servicio se podrá dar por finalizado aplicándose penalización del 100%.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">3. Política de Cancelación</h3>
                        <p>Las cancelaciones realizadas con un plazo superior a 24 horas antes del servicio no tendrán recargo. Si se cancela con un plazo menor, {companyInfo.name} retendrá el 100% del importe presupuestado.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">4. Equipaje y Capacidad</h3>
                        <p>La capacidad especificada para nuestros vehículos estándar/premium es estrictamente de un máximo de <strong>3 pasajeros y 2 maletas de medida estándar</strong> (dimensiones máximas aprox. 63 x 36 x 21 cm por maleta).</p>
                        <p className="mt-2">Esta capacidad es limitante. Si el grupo excede el volumen declarado o la capacidad legal máxima del vehículo a su llegada, el conductor no podrá realizar el servicio por vulneración de la normativa de seguridad vial, considerándose una cancelación por parte del cliente.</p>
                    </div>
                )
            }
        },
        en: {
            legal: {
                title: 'Legal Notice',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <p>In compliance with the duty of information contained in article 10 of Law 34/2002, of July 11, on Services of the Information Society and Electronic Commerce (LSSI-CE), the following identifying data are recorded:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Website Owner:</strong> {companyInfo.name}</li>
                            <li><strong>Tax ID (NIF):</strong> {companyInfo.nif}</li>
                            <li><strong>Registered Office:</strong> {companyInfo.address}</li>
                            <li><strong>Contact Email:</strong> {companyInfo.email}</li>
                            <li><strong>Main Activity:</strong> Private transport and transfer services (VTC).</li>
                        </ul>
                        <h3 className="text-white font-bold mt-6 mb-2">Intellectual and Industrial Property</h3>
                        <p>The intellectual property rights of the website, its source code, design, navigation structures, and the various elements contained therein belong to {companyInfo.name}, to whom corresponds the exclusive exercise of the rights to exploit them.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Conditions of Use</h3>
                        <p>The user of the website undertakes to make appropriate and lawful use of the website and its contents, in accordance with the applicable Legislation and this Legal Notice.</p>
                    </div>
                )
            },
            privacy: {
                title: 'Privacy Policy',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <p>At {companyInfo.name} we take the protection of your personal data very seriously. This Privacy Policy describes how we collect, use, and protect your data, in accordance with the General Data Protection Regulation (GDPR) and current EU privacy laws.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Data Controller</h3>
                        <p>Identity: {companyInfo.name} | Email: {companyInfo.email}</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Purpose</h3>
                        <p>Your data is collected exclusively to: manage reservations for transfer services, contact you in case of incidents with the service or billing, and ensure its correct provision.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Legitimation</h3>
                        <p>The legal basis for the processing of your data is the execution of the service provision contract (reservation) and the express consent of the user when filling out the reservation form.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Recipients</h3>
                        <p>Data will not be transferred to third parties except under legal obligation. The corresponding pick-up and destination data are shared only with the assigned driver in order to carry out the service.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Rights (GDPR)</h3>
                        <p>Anyone has the right to request access, rectification, deletion, limitation, and opposition to the processing of their data by sending an email to {companyInfo.email} attaching a copy of their ID or equivalent document.</p>
                    </div>
                )
            },
            cookies: {
                title: 'Cookie Policy',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <p>This website uses essential cookies for the correct technological operation of the platform. In accordance with Spanish regulations (LSSI-CE) and GDPR, we inform you about the use of cookies in our system.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">What are cookies?</h3>
                        <p>Cookies are small text files that are installed and stored in the browser when web pages are visited. Their main purpose is to remember details of the visit.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">Do you ask for permission to install cookies?</h3>
                        <p>Our website <strong>DOES NOT use third-party analysis or marketing tracking cookies</strong> (such as Google Analytics, Meta Pixel, etc.) that require explicit consent.</p>
                        <p>We only use <strong>TECHNICAL OR STRICTLY NECESSARY cookies</strong>. These allow maintaining the session state (for example, accessing the administration portal), preventing CSRF attacks, and remembering the browser language preference. Being essential, they are exempt from the obligation to obtain user consent.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">How to disable cookies</h3>
                        <p>You can restrict, block, or delete cookies from our site or any other website using your browser. However, we warn that by disabling these session cookies, the client and employee portal may stop operating normally.</p>
                    </div>
                )
            },
            terms: {
                title: 'Terms and Conditions',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <p>These General Sales Conditions govern the purchase of transfer services from {companyInfo.name} through the website.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">1. Reservations and Confirmation</h3>
                        <p>All reservations must be made well in advance. The reservation will not be considered "confirmed" until the system issues a voucher (PDF/Email) and payment, if applicable in advance, has been duly processed.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">2. Waiting Policy (Delays)</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Airport Pickups:</strong> A courtesy margin of up to 30 minutes from the scheduled flight landing time is granted. We monitor real-time flight data.</li>
                            <li><strong>City/Hotel Pickups:</strong> The waiting or courtesy time will be a maximum of 15 minutes from the agreed time.</li>
                        </ul>
                        <p>If these times are exceeded without locating the client (No-Show), the service may be considered complete, applying a 100% penalty.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">3. Cancellation Policy</h3>
                        <p>Cancellations made more than 24 hours before the service will have no surcharge. If canceled with less notice, {companyInfo.name} will retain 100% of the budgeted amount.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">4. Luggage and Capacity</h3>
                        <p>The specified capacity for our standard/premium vehicles is strictly a maximum of <strong>3 passengers and 2 standard-sized suitcases</strong> (maximum dimensions approx. 63 x 36 x 21 cm per suitcase).</p>
                        <p className="mt-2">This capacity is limiting. If the group exceeds the declared volume or the legal maximum capacity of the vehicle upon arrival, the driver will not be able to perform the service due to a violation of traffic safety regulations, which will be considered a cancellation by the client.</p>
                    </div>
                )
            }
        }
    };

    const currentContent = content[language][type];

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-brand-charcoal border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                    <h2 className="text-2xl font-light text-white tracking-tighter uppercase">{currentContent.title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <span className="material-icons-round text-brand-platinum">close</span>
                    </button>
                </div>

                {/* Body Component - Scrollable */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    {currentContent.body}
                </div>

                {/* Footer Optional Addon inside modal */}
                <div className="p-4 border-t border-white/5 bg-black/20 text-center shrink-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">&copy; {new Date().getFullYear()} {companyInfo.name}</p>
                </div>
            </div>
        </div>
    );
};
