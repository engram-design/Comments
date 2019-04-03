<?php
namespace Craft;

class CommentsPlugin extends BasePlugin
{
    // =========================================================================
    // PLUGIN INFO
    // =========================================================================

    public function getName()
    {
        return Craft::t('Comments');
    }

    public function getVersion()
    {
        return '0.5.2';
    }

    public function getSchemaVersion()
    {
        return '1.0.5.0';
    }

    public function getDeveloper()
    {
        return 'Verbb';
    }

    public function getDeveloperUrl()
    {
        return 'https://verbb.io';
    }

    public function getPluginUrl()
    {
        return 'https://github.com/verbb/comments';
    }

    public function getDocumentationUrl()
    {
        return 'https://verbb.io/craft-plugins/comments/docs';
    }

    public function getReleaseFeedUrl()
    {
        return 'https://raw.githubusercontent.com/verbb/comments/craft-2/changelog.json';
    }

    public function hasCpSection()
    {
        return true;
    }

    public function getSettingsUrl()
    {
        return 'comments/settings';
    }

    protected function defineSettings()
    {
        return array(
            'structureId'               => AttributeType::Number,
            'permissions'               => AttributeType::Mixed,
            'closed'                    => AttributeType::Mixed,

            // General
            'allowAnonymous'            => array( AttributeType::Bool, 'default' => false ),
            'requireModeration'         => array( AttributeType::Bool, 'default' => true ),
            'autoCloseDays'             => array( AttributeType::Number, 'default' => '' ),

            // Voting
            'allowVoting'               => array( AttributeType::Bool, 'default' => true ),
            'flaggedCommentLimit'       => array( AttributeType::Number, 'default' => '5' ),

            // Flagging
            'allowFlagging'             => array( AttributeType::Bool, 'default' => true ),
            'downvoteCommentLimit'      => array( AttributeType::Number, 'default' => '5' ),

            // Templates
            'templateFolderOverride'    => AttributeType::String,

            // Security
            'enableSpamChecks'          => AttributeType::Bool,
            'securityFlooding'          => AttributeType::Number,
            'securityModeration'        => AttributeType::Mixed,
            'securityBlacklist'         => AttributeType::Mixed,
            'securityBanned'            => AttributeType::Mixed,

            // Notifications
            'notificationAuthorEnabled' => array( AttributeType::Bool, 'default' => true ),
            'notificationReplyEnabled'  => array( AttributeType::Bool, 'default' => true ),

            // Permissions
            'permissions'               => AttributeType::Mixed,

            // Users
            //'users'                     => AttributeType::Mixed,
        );
    }

    public function registerCpRoutes()
    {
        return array(
            'comments/edit/(?P<commentId>\d+)' => array('action' => 'comments/editTemplate'),
            'comments/permissions' => array('action' => 'comments/permissions'),
            'comments/settings' => array('action' => 'comments/settings'),
        );
    }

    public function onAfterInstall()
    {

    	parent::onAfterInstall();

        // Comments are a Structure, which helps with hierarchy-goodness.
        // We only use a single structure for all our comments so store this at the plugin settings level
        if (!$this->getSettings()->structureId) {
            $structure = new StructureModel();

            craft()->structures->saveStructure($structure);

            // Update our plugin settings straight away!
            craft()->plugins->savePluginSettings($this, array('structureId' => $structure->id));
        }

    }

    public function onBeforeUninstall()
	{

		parent::onBeforeUninstall();

		// Delete the Comments structure
		if ($this->getSettings()->structureId) {
			craft()->structures->deleteStructureById($this->getSettings()->structureId);
		}

	}

	public function init()
    {
        // Only used on the /comments page, hook onto the 'cp.elements.element' hook to allow us to
        // modify the Title column for the element index table - we want something special.
        if (craft()->request->isCpRequest()) {
            craft()->templates->hook('cp.elements.element', array(craft()->comments, 'getCommentElementHtml'));
        }
    }



    // =========================================================================
    // HOOKS
    // =========================================================================

    public function registerEmailMessages()
    {
        return array(
            'comments_author_notification',
            'comments_reply_notification',
        );
    }

    public function registerUserPermissions()
    {
        return array(
            'commentsEdit' => array('label' => Craft::t('Edit other users\' comments')),
            'commentsTrash' => array('label' => Craft::t('Trash other users\' comments')),
            'commentsDelete' => array('label' => Craft::t('Delete comments')),
        );
    }

}