import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { useSupabaseData } from '../hooks/useSupabaseData';

interface LegalModalsProps {
    type: 'legal' | 'privacy' | 'cookies' | 'terms' | null;
    language: Language;
    onClose: () => void;
    standalone?: boolean;
}

export const LegalModals: React.FC<LegalModalsProps> = ({ type, language, onClose, standalone = false }) => {
    const { data: settings } = useSupabaseData('system_settings');
    const [companyInfo, setCompanyInfo] = useState({
        name: 'Palladium Transfers S.L.',
        nif: 'B26816025',
        address: 'Av. Maisonnave, 41 3ºB., 03003 - Alicante/Alacant (Alicante)',
        phone: '655454978',
        email: 'palladiumtransfers@gmail.com',
        web: 'https://www.palladiumtransfers.com',
        vtc: 'Autorizaciones de arrendamiento de vehículos con conductor (VTC) expedidas por la Generalitat Valenciana.'
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
                        <h3 className="text-white font-bold mt-4 mb-2">1. DATOS IDENTIFICATIVOS</h3>
                        <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSICE), se informa:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Denominación social:</strong> {companyInfo.name}</li>
                            <li><strong>CIF:</strong> {companyInfo.nif}</li>
                            <li><strong>Domicilio social:</strong> {companyInfo.address}</li>
                            <li><strong>Teléfono:</strong> {companyInfo.phone}</li>
                            <li><strong>Email:</strong> {companyInfo.email}</li>
                            <li><strong>Actividad:</strong> Transporte de viajeros</li>
                            <li><strong>Página web:</strong> <a href={companyInfo.web} className="text-brand-gold hover:underline">{companyInfo.web}</a></li>
                            <li><strong>Licencias VTC:</strong> {companyInfo.vtc}</li>
                        </ul>

                        <h3 className="text-white font-bold mt-6 mb-2">2. OBJETO Y CONDICIONES DE USO</h3>
                        <p>Palladium Transfers S.L. pone a disposición de los usuarios la presente plataforma web con la finalidad de gestionar los servicios de transporte de viajeros contratados. El acceso y uso de esta plataforma implica la aceptación de las presentes condiciones de uso.</p>
                        <p>El usuario se compromete a hacer un uso adecuado de los contenidos y servicios, no utilizándolos para actividades ilícitas o contrarias a la buena fe, al orden público, o que pudieran suponer una lesión de los derechos de terceros.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">3. PROPIEDAD INTELECTUAL E INDUSTRIAL</h3>
                        <p>Todos los contenidos de la plataforma, incluyendo textos, fotografías, gráficos, imágenes, iconos, tecnología, software, y demás contenidos audiovisuales o sonoros, así como su diseño gráfico y códigos fuente, son propiedad intelectual de Palladium Transfers S.L. o de terceros que han autorizado su uso, y están protegidos por las leyes vigentes en materia de propiedad intelectual e industrial.</p>
                        <p>Queda expresamente prohibida la reproducción, distribución, communication pública, transformación o cualquier otro acto de explotación sin la autorización expresa y por escrito de Palladium Transfers S.L..</p>

                        <h3 className="text-white font-bold mt-6 mb-2">4. EXCLUSIÓN DE RESPONSABILIDAD</h3>
                        <p>Palladium Transfers S.L. no se responsabiliza de los daños y perjuicios que pudieran derivarse de interferencias, omisiones, interrupciones, virus informáticos, averías telefónicas o desconexiones en el funcionamiento operativo del sistema electrónico. Tampoco se responsabiliza de posibles retrasos o bloqueos en el uso causados por deficiencias o sobrecargas de Internet.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">5. LEY APLICABLE Y JURISDICCIÓN</h3>
                        <p>Las presentes condiciones se rigen por la legislación española. Para la resolución de cualquier controversia o cuestión relacionada con la presente plataforma, las partes se someten a los Juzgados y Tribunales del domicilio del usuario, de conformidad con la normativa vigente de protección de consumidores y usuarios.</p>
                    </div>
                )
            },
            privacy: {
                title: 'Política de Privacidad',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <h3 className="text-white font-bold mt-4 mb-2">1. RESPONSABLE DEL TRATAMIENTO</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Denominación social:</strong> {companyInfo.name}</li>
                            <li><strong>CIF:</strong> {companyInfo.nif}</li>
                            <li><strong>Dirección:</strong> {companyInfo.address}</li>
                            <li><strong>Teléfono:</strong> {companyInfo.phone}</li>
                            <li><strong>Email:</strong> {companyInfo.email}</li>
                            <li><strong>Web:</strong> <a href={companyInfo.web} className="text-brand-gold hover:underline">{companyInfo.web}</a></li>
                        </ul>

                        <h3 className="text-white font-bold mt-6 mb-2">2. INFORMACIÓN Y CONSENTIMIENTO</h3>
                        <h4 className="text-white font-semibold mt-2">2.1 Principio de información</h4>
                        <p>Mediante el presente aviso de privacidad, Palladium Transfers S.L. informa a los usuarios de la plataforma web sobre el tratamiento de sus datos personales, en cumplimiento del Reglamento (UE) 2016/679, de 27 de abril de 2016 (RGPD), y de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</p>

                        <h4 className="text-white font-semibold mt-2">2.2 Finalidades del tratamiento</h4>
                        <p>Sus datos personales serán usados para nuestra relación y poder prestarle nuestros servicios propios como empresa de transporte de viajeros VIP, traslados con chófer privado y alquiler de vehículos de lujo con conductor. Dichos datos son necesarios para poder relacionarnos con usted y gestionar las reservas, traslados y servicios contratados, lo que nos permite el uso de su información personal dentro de la legalidad. Asimismo, también pueden ser usados para otras actividades, como enviarle publicidad o promocionar nuestras actividades, caso en el cual le pediremos los correspondientes consentimientos.</p>

                        <h4 className="text-white font-semibold mt-2">2.3 Base jurídica del tratamiento</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Ejecución del contrato de prestación de servicios de transporte (art. 6.1.b RGPD).</li>
                            <li>Cumplimiento de obligaciones legales aplicables, incluyendo la normativa de transporte de viajeros y, en su caso, el Real Decreto 933/2021 sobre registro de viajeros (art. 6.1.c RGPD).</li>
                            <li>Consentimiento del interesado para el envío de comunicaciones comerciales y publicidad (art. 6.1.a RGPD).</li>
                            <li>Interés legítimo del responsable del tratamiento para la gestión operativa de la flota y servicios (art. 6.1.f RGPD).</li>
                        </ul>

                        <h3 className="text-white font-bold mt-6 mb-2">3. DESTINATARIOS DE LOS DATOS</h3>
                        <p>Solo el personal de nuestra entidad que esté debidamente autorizado podrá tener conocimiento de la información que le pedimos. Asimismo, podrán tener conocimiento de su información aquellas entidades que necesiten tener acceso a la misma para que podamos prestarle nuestros servicios, tales como empresas de seguridad y geolocalización de vehículos, empresas de prevención de riesgos laborales y asesores laborales y fiscales. Igualmente, tendrán conocimiento de su información aquellas entidades públicas o privadas a las cuales estemos obligados a facilitar sus datos personales con motivo del cumplimiento de alguna ley.</p>
                        <p>Puede consultar el listado actualizado de encargados de tratamiento en nuestras oficinas.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">4. TRANSFERENCIAS INTERNACIONALES</h3>
                        <p>Su información puede ser tratada por proveedores de servicios tecnológicos con servidores ubicados fuera del Espacio Económico Europeo, concretamente en los Estados Unidos (Supabase Inc.). Esta transferencia se realiza al amparo del Marco de Privacidad UE-EE.UU. (adecuación 2023), siempre que el proveedor esté adherido al mismo, o mediante la aplicación de Cláusulas Contractuales Tipo aprobadas por la Comisión Europea.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">5. CONSERVACIÓN DE LOS DATOS</h3>
                        <p>Conservaremos sus datos durante nuestra relación y mientras nos obliguen las leyes aplicables. Una vez finalizados los plazos legales, procederemos a eliminarlos de forma segura. En particular:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Datos de reservas y servicios de transporte: durante la vigencia de la relación contractual y 5 años adicionales por prescripción de acciones civiles.</li>
                            <li>Datos fiscales y de facturación: 6 años (art. 30 Código de Comercio).</li>
                            <li>Registro de viajeros (si aplica RD 933/2021): 3 años desde la finalización del servicio.</li>
                            <li>Datos de videovigilancia (si aplica): máximo 30 días, salvo que sean prueba de hechos.</li>
                        </ul>

                        <h3 className="text-white font-bold mt-6 mb-2">6. DERECHOS DE LAS PERSONAS INTERESADAS</h3>
                        <p>En cualquier momento puede dirigirse a nosotros para saber qué información tenemos sobre usted, rectificarla si fuese incorrecta y eliminarla una vez finalizada nuestra relación, en el caso de que ello sea legalmente posible. También tiene derecho a:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Acceso: conocer qué datos personales tratamos sobre usted.</li>
                            <li>Rectificación: corregir datos inexactos o incompletos.</li>
                            <li>Supresión: solicitar la eliminación cuando los datos ya no sean necesarios.</li>
                            <li>Oposición: oponerse al tratamiento basado en interés legítimo o con fines de mercadotecnia directa.</li>
                            <li>Limitación del tratamiento: solicitar la restricción del tratamiento en determinadas circunstancias.</li>
                            <li>Portabilidad: recibir sus datos en un formato estructurado y de uso común.</li>
                            <li>No ser objeto de decisiones individualizadas automatizadas con efectos jurídicos.</li>
                        </ul>
                        <p>Para ejercer sus derechos, debe realizar una solicitud mediante cualquier medio válido de identificación (art. 12 RGPD) dirigida a:</p>
                        <p className="bg-white/5 p-4 rounded-xl font-mono text-xs">
                            Palladium Transfers S.L.<br />
                            Av. Maisonnave, 41 3ºB., 03003 - Alicante/Alacant (Alicante)<br />
                            Email: {companyInfo.email}
                        </p>
                        <p>En caso de que entienda que sus derechos han sido desatendidos por nuestra entidad, puede formular una reclamación ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" className="text-brand-gold hover:underline">www.aepd.es</a>) o llamando al 901 100 099 / 91 266 35 17.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">7. SEGURIDAD</h3>
                        <p>Palladium Transfers S.L. ha adoptado las medidas técnicas y organizativas necesarias para garantizar la seguridad e integridad de los datos personales que trata, así como para evitar su pérdida, alteración y/o acceso por parte de terceros no autorizados.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">8. ACTUALIZACIÓN DE LA POLÍTICA</h3>
                        <p>Nos reservamos el derecho a modificar la presente política para adaptarla a novedades legislativas o jurisprudenciales. En dichos supuestos, se anunciará en esta página los cambios introducidos con razonable antelación a su puesta en práctica.</p>
                    </div>
                )
            },
            cookies: {
                title: 'Política de Cookies',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <h3 className="text-white font-bold mt-4 mb-2">1. ¿QUÉ SON LAS COOKIES?</h3>
                        <p>Las cookies son pequeños archivos de texto que los sitios web instalan en el navegador o dispositivo del usuario cuando accede a ellos. Sirven para que el sitio web recuerde información sobre su visita, como su idioma preferido y otras opciones, lo que puede facilitar su próxima visita y hacer que el sitio le resulte más útil.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">2. TIPOS DE COOKIES QUE UTILIZAMOS</h3>
                        <div className="overflow-x-auto my-4 border border-white/10 rounded-xl">
                            <table className="min-w-full text-left text-xs text-slate-300">
                                <thead className="bg-white/5 text-white font-bold uppercase tracking-widest text-[10px] border-b border-white/10">
                                    <tr>
                                        <th className="p-3">Nombre</th>
                                        <th className="p-3">Dominio</th>
                                        <th className="p-3">Titular</th>
                                        <th className="p-3">Tipo</th>
                                        <th className="p-3">Finalidad</th>
                                        <th className="p-3">Duración</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr>
                                        <td className="p-3 font-mono font-bold text-white">__cf_bm</td>
                                        <td className="p-3">.palladiumtransfers.com</td>
                                        <td className="p-3">Cloudflare, Inc. (EE.UU.)</td>
                                        <td className="p-3">Necesaria</td>
                                        <td className="p-3">Soporte Cloudflare Bot Management. Distingue entre humanos y bots automatizados.</td>
                                        <td className="p-3">1 hora</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-mono font-bold text-white">Supabase</td>
                                        <td className="p-3">supabase.co</td>
                                        <td className="p-3">Supabase Inc. (EE.UU.)</td>
                                        <td className="p-3">Necesaria / Funcional</td>
                                        <td className="p-3">Gestión de sesiones y autenticación de usuarios en la plataforma.</td>
                                        <td className="p-3">Sesión</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p>Las cookies necesarias/técnicas no requieren el consentimiento del usuario al ser imprescindibles para el funcionamiento de la plataforma.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">3. TRANSFERENCIAS INTERNACIONALES</h3>
                        <p>Las cookies de Cloudflare, Inc. y Supabase Inc. implican transferencia de datos a EE.UU. Cloudflare y Supabase participan en el Marco de Privacidad UE-EE.UU. Puede verificar la adhesión en <a href="https://www.dataprivacyframework.gov" className="text-brand-gold hover:underline">www.dataprivacyframework.gov</a>.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">4. CÓMO GESTIONAR LAS COOKIES</h3>
                        <p>Puede configurar su navegador para aceptar o rechazar las cookies, o para que le avise cuando un sitio web quiera instalarlas. A continuación le indicamos cómo gestionar las cookies en los principales navegadores:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Google Chrome:</strong> Configuración &gt; Privacidad y seguridad &gt; Cookies y otros datos de sitios.</li>
                            <li><strong>Mozilla Firefox:</strong> Opciones &gt; Privacidad y Seguridad &gt; Cookies y datos del sitio.</li>
                            <li><strong>Safari:</strong> Preferencias &gt; Privacidad &gt; Gestionar datos de sitios web.</li>
                            <li><strong>Microsoft Edge:</strong> Configuración &gt; Permisos del sitio &gt; Cookies y datos del sitio.</li>
                        </ul>
                        <p>Tenga en cuenta que bloquear las cookies necesarias puede afectar al funcionamiento de la plataforma.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">5. ACTUALIZACIÓN DE ESTA POLÍTICA</h3>
                        <p>Palladium Transfers S.L. puede actualizar esta política de cookies para adaptarla a cambios tecnológicos, legislativos o de los servicios prestados. Le informaremos mediante aviso en la web cuando se produzcan cambios relevantes.</p>
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
                            <li><strong>Recogidas en Aeropuerto:</strong> Se concede un margen de cortesía de hasta 60 minutos (1 hora) desde la hora programada de aterrizaje del vuelo. Monitoreamos los tiempos reales. En el caso de cancelación o derivación del vuelo a otro aeropuerto se considerará con cliente no presentado.</li>
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
                        <h3 className="text-white font-bold mt-4 mb-2">1. IDENTIFYING DATA</h3>
                        <p>In compliance with article 10 of Law 34/2002, of July 11, on Services of the Information Society and Electronic Commerce (LSSICE), we inform you:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Company Name:</strong> {companyInfo.name}</li>
                            <li><strong>Tax ID (CIF):</strong> {companyInfo.nif}</li>
                            <li><strong>Registered Office:</strong> {companyInfo.address}</li>
                            <li><strong>Phone:</strong> {companyInfo.phone}</li>
                            <li><strong>Email:</strong> {companyInfo.email}</li>
                            <li><strong>Activity:</strong> Passenger transport</li>
                            <li><strong>Website:</strong> <a href={companyInfo.web} className="text-brand-gold hover:underline">{companyInfo.web}</a></li>
                            <li><strong>VTC Licenses:</strong> {companyInfo.vtc}</li>
                        </ul>

                        <h3 className="text-white font-bold mt-6 mb-2">2. OBJECT AND CONDITIONS OF USE</h3>
                        <p>Palladium Transfers S.L. provides users with this web platform to manage contracted passenger transport services. Access to and use of this platform implies acceptance of these conditions of use.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">3. INTELLECTUAL AND INDUSTRIAL PROPERTY</h3>
                        <p>All contents of the platform are the intellectual property of Palladium Transfers S.L. or third parties who have authorized their use, and are protected by applicable intellectual property laws.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">4. EXCLUSION OF LIABILITY</h3>
                        <p>Palladium Transfers S.L. is not responsible for damages resulting from technical issues, connection delays, or system outages beyond its control.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">5. APPLICABLE LAW AND JURISDICTION</h3>
                        <p>These conditions are governed by Spanish law. Any disputes shall be submitted to the courts of the user's domicile in accordance with consumer regulations.</p>
                    </div>
                )
            },
            privacy: {
                title: 'Privacy Policy',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <h3 className="text-white font-bold mt-4 mb-2">1. DATA CONTROLLER</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Company Name:</strong> {companyInfo.name}</li>
                            <li><strong>Tax ID (CIF):</strong> {companyInfo.nif}</li>
                            <li><strong>Address:</strong> {companyInfo.address}</li>
                            <li><strong>Phone:</strong> {companyInfo.phone}</li>
                            <li><strong>Email:</strong> {companyInfo.email}</li>
                        </ul>

                        <h3 className="text-white font-bold mt-6 mb-2">2. INFORMATION AND CONSENT</h3>
                        <p>In accordance with GDPR, Palladium Transfers S.L. informs users about how their personal data is processed. Your data is collected exclusively to manage VIP transfer bookings and private chauffeur services.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">3. DATA RECIPIENTS</h3>
                        <p>Only authorized personnel and necessary service providers (such as security, fleet management, and legal/tax advisors) will have access to your data. We do not sell or share data with third parties except under legal obligations.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">4. INTERNATIONAL DATA TRANSFERS</h3>
                        <p>Your data may be processed by technological providers with servers outside the EEA, specifically Supabase Inc. (USA). This transfer is conducted under the EU-US Data Privacy Framework (DPF) adequacy decision, or standard contractual clauses.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">5. DATA RETENTION</h3>
                        <p>Data will be stored during our contractual relationship and for the legally required periods (typically 5 to 6 years for legal and tax compliance, and up to 3 years for traveler registration records).</p>

                        <h3 className="text-white font-bold mt-6 mb-2">6. YOUR RIGHTS</h3>
                        <p>You have the right to access, rectify, delete, oppose, limit processing, and request portability of your data by writing to {companyInfo.email} along with a valid ID proof.</p>
                    </div>
                )
            },
            cookies: {
                title: 'Cookie Policy',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <h3 className="text-white font-bold mt-4 mb-2">1. WHAT ARE COOKIES?</h3>
                        <p>Cookies are small text files stored in your browser to remember information about your visit, improve usability, and maintain session states.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">2. COOKIES WE USE</h3>
                        <p>We only use strictly necessary technical cookies (from Cloudflare for bot management and Supabase for session authentication) which are exempt from requiring user consent under Spanish LSSI-CE regulations.</p>

                        <h3 className="text-white font-bold mt-6 mb-2">3. INTERNATIONAL TRANSFERS</h3>
                        <p>These essential cookies are managed by Cloudflare Inc. and Supabase Inc. with servers in the USA, adhering to the EU-US Data Privacy Framework.</p>
                    </div>
                )
            },
            terms: {
                title: 'Terms and Conditions',
                body: (
                    <div className="space-y-4 text-sm text-slate-300">
                        <h3 className="text-white font-bold mt-4 mb-2">1. RESERVATIONS</h3>
                        <p>All bookings must be requested in advance. Confirmation vouchers (PDF/Email) will be issued once the request is verified and processed.</p>
                        <h3 className="text-white font-bold mt-6 mb-2">2. WAITING TIMES</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Airport Pickups:</strong> A courtesy wait of up to 60 minutes (1 hour) is granted from the scheduled flight landing time. We monitor real-time flight data. In the case of flight cancellation or diversion to another airport, it will be considered as a client No-Show.</li>
                            <li><strong>City/Hotel Pickups:</strong> The maximum courtesy wait time is 15 minutes from the agreed pickup time.</li>
                        </ul>
                        <p>Exceeding these limits without contacting us (No-Show) will result in a 100% penalty fee, and the service will be canceled.</p>
                    </div>
                )
            }
        }
    };

    const currentContent = content[language][type];

    if (standalone) {
        return (
            <div className="flex flex-col bg-brand-charcoal text-slate-300">
                <h2 className="text-2xl font-light text-white tracking-tighter uppercase mb-6">{currentContent.title}</h2>
                <div className="text-sm space-y-4">
                    {currentContent.body}
                </div>
            </div>
        );
    }

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
