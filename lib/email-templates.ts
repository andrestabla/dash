export const getBaseUrl = () => {
    // Force primary domain as requested by user
    return 'https://misproyectos.com.co';
};

interface EmailTemplateProps {
    title: string;
    previewText: string;
    bodyContent: string;
    ctaLink?: string;
    ctaText?: string;
    footerText?: string;
}

export const generateEmailHtml = ({
    title,
    previewText,
    bodyContent,
    ctaLink,
    ctaText = "Ver en Tablero",
    footerText = "Dashboard App"
}: EmailTemplateProps) => {

    const primaryColor = "#3b82f6"; // Blue
    const backgroundColor = "#f3f4f6";
    const containerColor = "#ffffff";
    const textColor = "#1f2937";
    const dimColor = "#6b7280";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${backgroundColor}; color: ${textColor}; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background-color: ${containerColor}; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: 800; color: ${textColor}; text-decoration: none; display: inline-block; }
        .logo span { color: ${primaryColor}; }
        .divider { height: 1px; background-color: #e5e7eb; margin: 24px 0; }
        .button { display: inline-block; background-color: ${primaryColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; text-align: center; }
        .footer { text-align: center; font-size: 12px; color: ${dimColor}; margin-top: 24px; }
        blockquote { border-left: 4px solid ${primaryColor}; margin: 16px 0; padding: 8px 16px; background: #eff6ff; border-radius: 0 8px 8px 0; color: ${textColor}; font-style: italic; }
        @media only screen and (max-width: 600px) {
            .container { padding: 12px; }
            .card { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="${getBaseUrl()}" class="logo">Dash<span>board</span></a>
        </div>
        
        <div class="card">
            <h2 style="margin-top: 0; font-size: 20px; color: ${textColor};">${title}</h2>
            <p style="font-size: 16px; line-height: 1.6; color: ${dimColor}; margin-bottom: 24px;">
                ${bodyContent}
            </p>
            
            ${ctaLink ? `
                <div style="text-align: center; margin-top: 32px;">
                    <a href="${ctaLink}" class="button">${ctaText}</a>
                </div>
            ` : ''}
            
            <div class="divider"></div>
            <p style="font-size: 12px; color: ${dimColor}; margin: 0;">
                Recibiste este correo porque eres parte del equipo en <strong>${footerText}</strong>.
            </p>
        </div>
        
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Dashboard App. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
    `;
};
