import { Resend } from "resend";
import { config } from "./index.js";
import logger from "./logger.js";

type TemplateType =
  | "email-verification-code"
  | "password-reset-code"
  | "welcome-message";

const resend = new Resend(config.resendKey);

// first check is template name is valid
const verifyTemplateNameIsValid = async (alias: TemplateType) => {
  const { data, error } = await resend.templates.get(alias);
  if (error) {
    logger.error(
      `Error fetching template with name ${alias} from Resend: ${error.message}`
    );
    throw new Error(`Template with name ${alias} not found in Resend`);
  }
  return data;
};

// const sendWelcomeEmail = async (userEmail: string, userName: string, templateName: TemplateType) => {

//     verifyTemplateNameIsValid(templateName);
//     const { data, error } = await resend.emails.send({
//         from: config.fromEmail,
//         to: [userEmail],
//         subject: "Welcome to our platform",
//         template: {
//             id: templateName,
//             variables: {
//                 USER_NAME: userName,
//                 ECOM_FRONTEND_HOMEPAGE: config.frontendUrl
//             }
//         }
//     })
// }

/**
 * Sneding email with resend
 * needs
 * to user email,user name , user id , template name, template variables,  subject, retries:number of retries in case of failure initially set to 0 ( Number of retry attempts (default: 0))
 * 
 * template variables should be in the format of { VARIABLE_NAME: value }
 * variables: {
    CTA: 'Sign up now',
    CTA_LINK: 'https://example.com/signup'
}

 */

const sendEmail = async (
  to: string,
  subject: string,
  templateName: TemplateType,
  variables: Record<string, any>,
  retries: number = 0
): Promise<{ success: boolean; error?: string; messageId?: string }> => {
  try {
    await verifyTemplateNameIsValid(templateName);
    // Implementation here
    const { data, error } = await resend.emails.send({
      from: config.fromEmail,
      to: [to],
      subject: subject,
      template: {
        id: templateName,
        variables: variables,
      },
    });
    if (error) {
      // logger.error(`Error sending email to ${to}: ${error.message}`);
      logger.error("ResendAPI error ", {
        to,
        subject,
        templateName,
        variables,
        retries,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
    // logger.info(`Email sent successfully to ${to} from template ${templateName} with messageId: ${data?.id}`);
    logger.info("Email sent successfully", {
      to,
      subject,
      messageId: data?.id,
      templateName,
      variables,
      retries,
    });
    return { success: true, messageId: data?.id };
  } catch (error) {
    // logger.error(`Error sending email to ${to}: ${error} using ${templateName} template` + (retries > 0 ? `, retries left: ${retries}` : ''));
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    logger.error("Email send exception", {
      to,
      subject,
      templateName,
      variables,
      retries,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
};

// send email with retry mechanism
/**
 * to: recipient email address
 * subject: email subject
 * templateName: name of the template to be used for sending email
 * variables: template variables in the format of { VARIABLE_NAME: value }
 * maxRetries: maximum number of retries in case of failure (default: 3)
 * delayMs: delay between retries in milliseconds (default: 2000ms)
 *
 * The function will attempt to send the email and if it fails, it will retry until the maximum number of retries is reached. The delay between retries will increase exponentially (2^retries * delayMs) to avoid overwhelming the email service.
 */

const sendEmailWithRetry = async (
  to: string,
  subject: string,
  templateName: TemplateType,
  variables: Record<string, any>,
  maxRetries: number = 3, // Number of retry attempts (default: 3)
  delayMs: number = 2000 // 2s initial delay
): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
  attempts: number;
}> => {
  await verifyTemplateNameIsValid(templateName);
  let retries = 0;
  while (retries <= maxRetries) {
    const result = await sendEmail(
      to,
      subject,
      templateName,
      variables,
      retries
    );
    if (result.success) {
      return { ...result, attempts: retries };
    }
    retries++;
    if (retries <= maxRetries) {
      const delay = Math.pow(2, retries - 1) * delayMs;
      logger.info(`Retrying email send to ${to} in ${delay}ms`);
      logger.warn(`Email send failed, retrying in ${delayMs}ms...`, {
        to,
        subject,
        retries,
        maxRetries,
        templateName,
        variables,
        error: result.error,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return {
    success: false,
    error: `All retry attempts failed. Failed to send email after ${maxRetries} retries`,
    attempts: maxRetries,
  };
};

export { sendEmail, sendEmailWithRetry };
