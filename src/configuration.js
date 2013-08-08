/*
 *    Copyright (C) 2012 by Martin Hoeher <martin@rpdev.net>
 *    Copyright (C) 2013 by Mudar Noufal <mn@mudar.ca>
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Authentication Modes
 */
USER_MODE_DJ = 10;
USER_MODE_GUEST = 5;

/**
 * Default Configuration
 */
DEFAULT_CONFIG_LANG = 'en';
DEFAULT_CONFIG_PORT = 8084;
DEFAULT_CONFIG_VOLUME_STEP = 5;
DEFAULT_CONFIG_BASIC_AUTH = true;
DEFAULT_CONFIG_USER = "foo";
DEFAULT_CONFIG_PASSWD = "bar67#";
DEFAULT_CONFIG_PASSWD_GUEST = "guest";
DEFAULT_GUEST_INTERVAL = 30; // seconds 
USER_MODE = USER_MODE_GUEST;
GUEST_LAST_SUBMIT = (new Date()).getTime();
GUEST_RESET_AFTER_DJ = false;

/**
 * Constants
 */
SERVERVERSION = 7;
ENGINE_STATE_PLAY = 0;
ENGINE_STATE_PAUSE = 1;
THUMB_SIZE = 80;
LINE_BREAK = '\r\n';
ERROR_CODE_GUEST_COUNTDOWN = 10;

/*
 * Creates a new Configuration object
 * 
 * This contructor is used to create a new configuration object. The sole
 * purpose of this class is to provide settings that can be changed by the
 * user. Settings can be saved and stored using the API provided by Amarok.
 * The class also provides GUI functionality, so the user can change the
 * settings of the plugin directly from within Amarok.
 */
function Configuration(webui) {
  this.webui = webui;
  this.dialog = null;
  this.restoreDefaultSettings();
}


/*
 * Returns the configuration volume step
 */
getVolumeStep = function(){
	var volumeStep = 5;
	return readConfigV( "volumeStep", volumeStep );
}


/*
 * Saves the configuration
 */
Configuration.prototype.saveSettings = function() {
  writeConfigV( "lang", this.lang );
  writeConfigV( "port", this.port );
  writeConfigV( "volumeStep", this.volumeStep );
  writeConfigV( "basicAuth", this.basicAuth );
  writeConfigV( "user", this.user );
  writeConfigV( "passwd", this.passwd );
  writeConfigV( "passwdGuest", this.passwdGuest );
  writeConfigV( "guestInterval", this.guestInterval );
  writeConfigV( "externalCollection", this.externalCollection );
}

/*
 * Restores the configuration
 * 
 * This reads the settings via Amarok's settings API. If settings have not been
 * saved previously, the currently set value for the property is used as default
 * value instead.
 */
Configuration.prototype.restoreSettings = function() {
  this.lang = readConfigV( "lang", this.lang );
  this.port = readConfigV( "port", this.port );
  this.volumeStep = readConfigV( "volumeStep", this.volumeStep );
  this.basicAuth = readConfigV( "basicAuth", this.basicAuth );
  this.user = readConfigV( "user", this.user );
  this.passwd = readConfigV( "passwd", this.passwd );
  this.passwdGuest = readConfigV( "passwdGuest", this.passwdGuest );
  this.guestInterval = readConfigV( "guestInterval", this.guestInterval );
  this.externalCollection = readConfigV( "externalCollection", this.externalCollection );
}

/*
 * Sets the default settings
 * 
 * This sets the default settings of the configuration.
 */
Configuration.prototype.restoreDefaultSettings = function() {
  this.lang = DEFAULT_CONFIG_LANG;
  this.port = DEFAULT_CONFIG_PORT;
  this.volumeStep = DEFAULT_CONFIG_VOLUME_STEP;
  this.basicAuth = DEFAULT_CONFIG_BASIC_AUTH;
  this.user = DEFAULT_CONFIG_USER;
  this.passwd = DEFAULT_CONFIG_PASSWD;
  this.passwdGuest = DEFAULT_CONFIG_PASSWD_GUEST;
  this.guestInterval = DEFAULT_GUEST_INTERVAL;
  this.externalCollection = "/media/";
}

/*
 * Show the configuration dialog.
 * 
 * This shows the configuration dialog which allows the user to configure the
 * plugin.
 */
Configuration.prototype.configure = function() {
  try {
    this.setupGui();
    this.setValues();
    return this.dialog.exec();
  } catch ( ex ) {
    printStackTrace( ex );
  }
}




/*
 * Constructs the configuration dialog UI
 * 
 * If not already done, this constructs the dialog that is shown to the user
 * to let him configure the plugin.
 */
Configuration.prototype.setupGui = function() {
	if ( !this.dialog ) {
		this.dialog = new QDialog();
		this.dialog.setContentsMargins(10, 10, 10, 0);
		this.dialog.windowTitle = "Amarok Apollo WebUI";
		this.dialog.layout = new QVBoxLayout( this.dialog );

		this.urlLabel = new QLabel( "" );
		this.dialog.layout.addWidget( this.urlLabel, 0, 0 );
		this.urlLabel.setContentsMargins(0,0,0,15);

		this.componentsLayout = new QFormLayout();
		this.dialog.layout.addLayout( this.componentsLayout );
		this.componentsLayout.setContentsMargins(0,0,0,15);

		this.langComboBox = new QComboBox( this.dialog );
		this.langComboBox.addItem('Brazilian Portuguese','pt_BR');
		this.langComboBox.addItem('English','en');
		this.langComboBox.addItem('French','fr');
		this.langComboBox.addItem('German','de');
		this.langComboBox.addItem('Italian','it');
		this.langComboBox.addItem('Portuguese','pt');
		this.langComboBox.addItem('Russian','ru');
		this.langComboBox.addItem('Spanish','es');

		this.portSpinBox = new QSpinBox( this.dialog );
		this.portSpinBox.minimum = 1;
		this.portSpinBox.maximum = 65535;
		this.volumeStepSpinBox = new QSpinBox( this.dialog );
		this.volumeStepSpinBox.minimum = 1;
		this.volumeStepSpinBox.maximum = 100;
		this.basicAuthCheckBox = new QCheckBox( this.dialog );
		this.basicAuthCheckBox.stateChanged.connect(this, this.toggleAuthentication);
		this.userLineEdit = new QLineEdit( this.dialog );
		this.passwordLineEdit = new QLineEdit( this.dialog );
		this.passwordLineEdit.echoMode = QLineEdit.Password;
		this.passwordGuestLineEdit = new QLineEdit( this.dialog );
		this.guestIntervalSpinBox = new QSpinBox( this.dialog );
		this.guestIntervalSpinBox.minimum = 0;
		this.guestIntervalSpinBox.maximum = 6000;
		this.guestIntervalSpinBox.singleStep = 10;
		this.toggleAuthentication();

		this.componentsLayout.addRow( "Language", this.langComboBox );
		this.componentsLayout.addRow( "Port", this.portSpinBox );
		this.componentsLayout.addRow( "Volume Step", this.volumeStepSpinBox );
		this.componentsLayout.addRow( "Enable Authentication", this.basicAuthCheckBox );
		this.componentsLayout.addRow( "Username", this.userLineEdit );
		this.componentsLayout.addRow( "DJ Password", this.passwordLineEdit );
		this.componentsLayout.addRow( "Guests Password", this.passwordGuestLineEdit );
		this.componentsLayout.addRow( "Guests Countdown (Seconds)", this.guestIntervalSpinBox );
		
		this.dialogButtons = new QDialogButtonBox( this.dialog );
		this.dialog.layout.addWidget( this.dialogButtons, 0, 0 );
		this.dialogButtons.addButton( QDialogButtonBox.Ok );
		this.dialogButtons.addButton( QDialogButtonBox.Cancel );
		this.dialogButtons.addButton( QDialogButtonBox.RestoreDefaults ).clicked.connect(this, this.restoreAndSetDefaults );

		this.dialogButtons.accepted.connect( this, this.acceptAndClose );
		this.dialogButtons.rejected.connect( this, this.discardAndClose );
	}
}

/*
 * Writes settings to the GUI
 * 
 * This method writes the settings from the Configuration instance "config"
 * to the GUI. If called without parameters, this method write the settings
 * of the this object instead.
 */
Configuration.prototype.setValues = function( config ) {
  if ( !config ) {
    config = this;
  }
  this.langComboBox.setCurrentIndex(this.langComboBox.findData(config.lang));
  this.portSpinBox.value = config.port;
  this.volumeStepSpinBox.value = config.volumeStep;
  this.basicAuthCheckBox.checked = config.basicAuth;
  this.userLineEdit.text = config.user;
  this.passwordLineEdit.text = config.passwd;
  this.passwordGuestLineEdit.text = config.passwdGuest;
  this.guestIntervalSpinBox.value = config.guestInterval;
  
  ipAddress = getIpAddress();
  if ( ipAddress == false ) {
	this.urlLabel.text = "Configure Amarok Apollo WebUI";  
  }
  else {
	this.urlLabel.text = 'Start using Amarok Apollo WebUI: <a href="http://' + ipAddress + ':' + config.port + '/">http://' + ipAddress + ':' + config.port + '/</a>';
	this.urlLabel.textFormat = Qt.RichText;
	this.urlLabel.textInteractionFlags = Qt.TextBrowserInteraction;
	this.urlLabel.openExternalLinks = true;
  }
  
}

/*
 * Sets the default values in the GUI
 */
Configuration.prototype.restoreAndSetDefaults = function() {
  this.setValues( new Configuration() );
}

/*
 * Toggle enabled/disabled status based on checkbox
 */
Configuration.prototype.toggleAuthentication = function() {
	var isEnabled = (this.basicAuthCheckBox.checkState() != Qt.Unchecked);
	this.userLineEdit.enabled = isEnabled ;
	this.passwordLineEdit.enabled = isEnabled ;
	this.passwordGuestLineEdit.enabled = isEnabled ;
	this.guestIntervalSpinBox.enabled = isEnabled ;
}

/*
 * Apply the settings from the GUI.
 * 
 * This method is called when the user uses accepts the current settings in
 * the GUI. It will read the settings from the GUI, save them and apply
 * them afterwards.
 * 
 * TODO: Check input for validity
 */
Configuration.prototype.acceptAndClose = function() {
  this.lang = this.langComboBox.itemData(this.langComboBox.currentIndex);
  this.port = this.portSpinBox.value;
  this.volumeStep = this.volumeStepSpinBox.value;
  this.basicAuth = this.basicAuthCheckBox.checked;
  this.user = this.userLineEdit.text;
  this.passwd = this.passwordLineEdit.text;
  this.passwdGuest = this.passwordGuestLineEdit.text;
  this.guestInterval = this.guestIntervalSpinBox.value;
  this.saveSettings();
  this.dialog.accept();
}

/*
 * Discard the current settings from the GUI
 * 
 * This method is called when the user discards the settings from the GUI.
 * This will simply close the dialog.
 */
Configuration.prototype.discardAndClose = function() {
  this.dialog.reject();
}
