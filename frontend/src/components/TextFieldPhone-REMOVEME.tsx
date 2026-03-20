import { MuiTelInput } from "mui-tel-input";
//import { i18n, getProbableCountryFromLanguage } from "../../i18n";
import { i18n } from '@/i18n';

const TextFieldPhone = ({
  variant = "outlined",
  fullWidth = true,
  size = "small",
  margin = "dense",
  //placeholder = "Search...",
  ...props
}) => {
  const flagsBaseUrl = "/flags";
  props.value = props.value ?? "";
  props.variant = props.variant ?? variant;
  props.fullWidth = props.fullWidth ?? fullWidth;
  props.size = props.size ?? size;
  props.margin = props.margin ?? margin;
  props.onChange = props.onChange ?? (() => { }); // without an onChange prop this component is unuseful

  return <MuiTelInput
    value={props.value}
    onChange={props.onChange}
    defaultCountry={getProbableCountryFromLanguage(i18n.language)/*config.i18n.country*/}
    langOfCountryName={i18n.language}
    placeholder={"phone number"}
    forceCallingCode={true}
    focusOnSelectCountry={true}
    //onlyCountries={["IT", "FR", "CH", "DE", "GB", "US"]}
    //preferredCountries={["IT", "FR", "CH", "DE", "GB", "US"]}
    preferredCountries={["it"]}
    disableFormatting // can't enable formatting since there is a bug which moves the cursor at the end when editing a number...
    getFlagElement={(isoCode, /*{ countryName }*/) => {
      const src = `${flagsBaseUrl}/${isoCode.toLowerCase()}.webp`;
      return <img src={src} width="32" />; // use flags locally (see scripts/download-language-flags.js) to avoid service-worker caching issues
    }}
    {...props}
  />
};

export default TextFieldPhone;
