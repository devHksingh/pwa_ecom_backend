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
  try {
    const { data, error } = await resend.templates.get(alias);
    if (error) {
      logger.error(
        `Error fetching template with name ${alias} from Resend: ${error.message}`
      );
      throw new Error(`Template with name ${alias} not found in Resend`);
    }
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch template";
    logger.error(
      `Error fetching template with name ${alias} from Resend: ${errorMessage}`,
      {
        templateName: alias,
        error: errorMessage,
      }
    );
    throw new Error(`Template with name ${alias} not found in Resend`);
  }
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
  to: string, // user email id
  subject: string,
  templateName: TemplateType,
  variables: Record<string, any>,
  retries: number = 0,
  userId: string = "", // optional user id for logging purposes
  username: string = "" // optional username for logging purposes
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
        userId,
        username,
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
      userId,
      username,
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
 *useExponentialBackoff - Use exponential backoff (default: true)
 * The function will attempt to send the email and if it fails, it will retry until the maximum number of retries is reached. The delay between retries will increase exponentially (2^retries * delayMs) to avoid overwhelming the email service.
 * return Result with success status and attempt count
 */

const sendEmailWithRetry = async (
  to: string,
  subject: string,
  templateName: TemplateType,
  variables: Record<string, any>,
  maxRetries: number = 3, // Number of retry attempts (default: 3)
  delayMs: number = 2000, // 2s initial delay
  useExponentialBackoff: boolean = true,
  userId: string = "", // optional user id for logging purposes
  username: string = "" // optional username for logging purposes
): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
  attempts: number;
}> => {
  try {
    // validating template once before any email send attempts.
    await verifyTemplateNameIsValid(templateName);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Template validation failed";
    return {
      success: false,
      error: errorMessage,
      attempts: 0,
    };
  }
  // Attempt to send email with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await sendEmail(
      to,
      subject,
      templateName,
      variables,
      attempt,
      userId,
      username
    );
    if (result.success) {
      return {
        success: true,
        messageId: result.messageId || "",
        attempts: attempt,
      };
    }
    // If not the last attempt, wait before retrying
    if (attempt < maxRetries) {
      const delay = useExponentialBackoff
        ? Math.pow(2, attempt - 1) * delayMs // expo :2s,4s,8s
        : delayMs; // fixed :2s,2s,2s
      logger.warn(`Email send failed ,retrying in ${delay}ms ...`, {
        to,
        subject,
        attempt,
        maxRetries,
        templateName,
        nextDelay: delay,
        error: result.error,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // all attempt are exhausted
  return {
    success: false,
    error: `Failed to send email after ${maxRetries} attempts. `,
    // messageId:"",
    attempts: maxRetries,
  };
};

export { sendEmail, sendEmailWithRetry };
export default resend;
