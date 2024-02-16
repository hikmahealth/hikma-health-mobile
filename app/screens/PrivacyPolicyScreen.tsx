import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import { TextStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Divider, Screen, Text, View } from "app/components"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "app/models"

interface PrivacyPolicyScreenProps extends AppStackScreenProps<"PrivacyPolicy"> {}

export const PrivacyPolicyScreen: FC<PrivacyPolicyScreenProps> = observer(
  function PrivacyPolicyScreen() {
    // Pull in one of our MST stores
    // const { someStore, anotherStore } = useStores()

    // Pull in navigation via hook
    // const navigation = useNavigation()
    return (
      <Screen preset="scroll" style={$screen}>
        <Text style={{ fontStyle: "italic" }} size="xs">
          Hikma Health is an independent 501(c)(3) nonprofit and is not affiliated with Hikma
          Pharmaceuticals PLC or any of its affiliates.
        </Text>
        <Divider style={{ marginVertical: 20 }} />
        <Text size="xl">Hikma Health Application Privacy policy</Text>
        <Text style={{ fontStyle: "italic" }} size="xs">
          Last updated: October 1, 2020
        </Text>
        <View style={$policyContainer}>
          <Text>
            Please read this Terms of Use statement in full before downloading or using the Hikma
            Health application ("Application"). By downloading or using the Application, you are
            agreeing to be bound by the terms and conditions of this Agreement. If you do not agree
            to the terms of this Agreement, do not download or use the Application. Hikma Health
            ("us", "we", or "our") operates the Hikma Health application (“Application”). This page
            informs you of our policies regarding the collection, use and disclosure of Personal
            Information we receive from users of the Application. The Application is an open source
            application and is provided by Hikma Health at no cost and is intended for use as is. If
            you choose to use our Application, then you agree to the collection and use of
            information in relation to this policy. The Personal Information that we collect is used
            for providing and improving the Application. We will not use or share your information
            with anyone except as described in this Privacy Policy.
          </Text>
          <View style={$section}>
            <Text style={$textStyle}>Information Collection and Use</Text>
            <Text>
              While using our Application, we may ask you to provide us with certain personally
              identifiable information that can be used to contact or identify you. Additionally,
              you may use the Application to collect patient health information. In this case,
              personally identifiable information may include, but is not limited to your name,
              email address, and patient health information ("Personal Information"). All
              information that is collected by the Application is encrypted and will not be shared
              with third parties for any reason at any time. Personal information that is collected
              will be retained by us and used as described in this privacy policy. The app does use
              third party services provided by Google Play Services that may collect information
              used to identify you. All data collected and used by third party services is described
              in the privacy policy of Google Play Services.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Log Data</Text>
            <Text>
              We want to inform you that whenever you use our Application, in a case of an error in
              the delivery of services, we may collect data and information (through third party
              products) on your phone called Log Data. This Log Data may include information such as
              your device Internet Protocol (“IP”) address, device name, operating system version,
              the configuration of the app when utilizing our Application, the time and date of your
              use of the Application, and other statistics.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Cookies</Text>
            <Text>
              Cookies are files with a small amount of data that are commonly used as anonymous
              unique identifiers. These are sent to your browser from the websites that you visit
              and are stored on your device{"'"}s internal memory. This Application does not use
              these “cookies” explicitly. However, the Application may use third party code and
              libraries that use “cookies” to collect information and improve their services. You
              have the option to either accept or refuse these cookies and know when a cookie is
              being sent to your device. If you choose to refuse our cookies, you may not be able to
              use some portions of this Application.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Service Providers</Text>
            <Text>
              We may employ third-party companies and individuals due to the following reasons: To
              facilitate our Application; To provide the Application on our behalf; To perform
              Application-related services; or To assist us in analyzing how our Service is used. We
              want to inform users of this Application that these third parties may have access to
              your Personal Information. The reason is to perform the tasks assigned to them on our
              behalf. However, they are obligated not to disclose or use the information for any
              other purpose.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Security</Text>
            <Text>
              We value your trust in providing us your Personal Information, thus we are striving to
              use commercially acceptable means of protecting it. But remember that no method of
              transmission over the internet, or method of electronic storage is 100% secure and
              reliable, and we cannot guarantee its absolute security.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Links to Other Sites</Text>
            <Text>
              This Application may contain links to other sites. If you click on a third-party link,
              you will be directed to that site. Note that these external sites are not operated by
              us. Therefore, we strongly advise you to review the Privacy Policy of these websites.
              We have no control over and assume no responsibility for the content, privacy
              policies, or practices of any third-party sites or services.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Children’s Privacy</Text>
            <Text>
              This Application does not address anyone under the age of 13. We do not knowingly
              collect personally identifiable information from children under 13. In the case we
              discover that a child under 13 has provided us with their personal information, we
              immediately delete this from our servers. If you are a parent or guardian and you are
              aware that your child has provided us with personal information, please contact us so
              that we will be able to take necessary steps.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Changes to This Privacy Policy</Text>
            <Text>
              This Privacy Policy is effective as of October 1, 2020 and will remain in effect
              except with respect to any changes in its provisions in the future, which will be in
              effect immediately after being posted on this page. We reserve the right to update or
              change our Privacy Policy at any time and you should check this Privacy Policy
              periodically. Your continued use of the Service after we post any modifications to the
              Privacy Policy on this page will constitute your acknowledgment of the modifications
              and your consent to abide and be bound by the modified Privacy Policy.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Hikma Health Application Terms of Use</Text>
            <Text>
              Last updated: October 1, 2020 Please read this Terms of Use statement in full before
              downloading or using the Hikma Health application ("Application"). By downloading or
              using the Application, you are agreeing to be bound by the terms and conditions of
              this Agreement. If you do not agree to the terms of this Agreement, do not download or
              use the Application.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>License</Text>
            <Text>
              Hikma Health grants you a revocable, non-exclusive, non-transferable, limited license
              to download, install and use the Application solely for your personal, non-commercial
              purposes strictly in accordance with the terms of this Agreement.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Restrictions</Text>
            <Text>
              You agree not to, and you will not permit others to license, sell, rent, lease,
              assign, distribute, transmit, host, outsource, disclose or otherwise commercially
              exploit the Application or make the Application available to any third party.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Modifications to Application</Text>
            <Text>
              Hikma Health reserves the right to modify, suspend or discontinue, temporarily or
              permanently, the Application or any service to which it connects, with or without
              notice and without liability to you.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Term and Termination</Text>
            <Text>
              This Agreement shall remain in effect until terminated by you or Hikma Health. Hikma
              Health may, in its sole discretion, at any time and for any or no reason, suspend or
              terminate this Agreement with or without prior notice. This Agreement will terminate
              immediately, without prior notice from Hikma Health, in the event that you fail to
              comply with any provision of this Agreement. You may also terminate this Agreement by
              deleting the Application and all copies thereof from your electronic devices. Upon
              termination of this Agreement, you shall cease all use of the Application and delete
              all copies of the Application from your mobile device or from your electronic devices.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Severability</Text>
            <Text>
              If any provision of this Agreement is held to be unenforceable or invalid, such
              provision will be changed and interpreted to accomplish the objectives of such
              provision to the greatest extent possible under applicable law and the remaining
              provisions will continue in full force and effect.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Amendments to this Agreement</Text>
            <Text>
              Hikma Health reserves the right, at its sole discretion, to modify or replace this
              Agreement at any time. If a revision is material we will provide at least 30 days{"'"}{" "}
              notice prior to any new terms taking effect. What constitutes a material change will
              be determined at our sole discretion.
            </Text>
          </View>
          <View style={$section}>
            <Text style={$textStyle}>Contact Information</Text>
            <Text>
              If you have any questions about this Agreement, please contact us at
              info@hikmahealth.org.
            </Text>
          </View>
        </View>
        <View style={{ height: 28 }} />
      </Screen>
    )
  },
)
const $textStyle: TextStyle = {
  fontWeight: "600",
  fontSize: 20,
}

const $screen = {
  padding: 10,
  paddingTop: 20,
}

const $policyContainer = {
  gap: 10,
  paddingTop: 12,
}

const $section = {}
