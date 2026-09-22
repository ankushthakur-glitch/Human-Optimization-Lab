import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SCRATCH = path.join(PROJECT, "scripts", ".cache")
fs.mkdirSync(SCRATCH, { recursive: true })

const DIST =
  path.join(PROJECT, "node_modules/@hugeicons/core-free-icons/dist/esm")

const available = new Set(
  fs
    .readdirSync(DIST)
    .filter((f) => f.endsWith(".js") && !f.endsWith(".map"))
    .map((f) => f.replace(/\.js$/, ""))
)

// remix name -> [export name, ...hugeicons candidates in preference order]
const MAP = {
  RiAddLine: ["IconAdd", "PlusSignIcon", "Add01Icon"],
  RiAlertLine: ["IconAlert", "Alert02Icon", "AlertCircleIcon", "Alert01Icon"],
  RiArrowDownSLine: ["IconChevronDown", "ArrowDown01Icon"],
  RiArrowLeftSLine: ["IconChevronLeft", "ArrowLeft01Icon"],
  RiArrowRightSLine: ["IconChevronRight", "ArrowRight01Icon"],
  RiArrowUpSLine: ["IconChevronUp", "ArrowUp01Icon"],
  RiBarChartBoxLine: ["IconChartBox", "ChartBarLineIcon", "ChartColumnIcon", "Chart01Icon"],
  RiBarChartLine: ["IconChart", "ChartLineData01Icon", "Chart02Icon", "ChartIcon"],
  RiBuildingLine: ["IconBuilding", "Building01Icon", "Building02Icon"],
  RiCalendarLine: ["IconCalendar", "Calendar01Icon", "Calendar03Icon"],
  RiCapsuleLine: ["IconMedication", "Medicine01Icon", "Medicine02Icon", "PillIcon"],
  RiCheckLine: ["IconCheck", "Tick02Icon", "Tick01Icon"],
  RiCloseLine: ["IconClose", "Cancel01Icon", "MultiplicationSignIcon"],
  RiCompass3Line: ["IconCompass", "Compass01Icon", "CompassIcon", "Navigation03Icon"],
  RiDashboardLine: ["IconDashboard", "DashboardSquare01Icon", "DashboardSquare02Icon"],
  RiDownloadLine: ["IconDownload", "Download01Icon", "Download04Icon"],
  RiErrorWarningLine: ["IconWarning", "AlertCircleIcon", "Alert01Icon"],
  RiExpandUpDownLine: ["IconExpandVertical", "UnfoldMoreIcon", "ArrowDataTransferVerticalIcon"],
  RiExternalLinkLine: ["IconExternalLink", "LinkSquare01Icon", "LinkSquare02Icon", "Link01Icon"],
  RiEyeLine: ["IconEye", "ViewIcon", "Eye01Icon"],
  RiFileList3Line: ["IconFileList", "TaskDaily01Icon", "Note01Icon", "File02Icon"],
  RiFileTextLine: ["IconFileText", "File01Icon", "DocumentValidationIcon"],
  RiFilter3Line: ["IconFilter", "FilterIcon", "FilterHorizontalIcon"],
  RiFlaskLine: ["IconLab", "TestTube01Icon", "TestTubeIcon", "LaboratoryIcon"],
  RiHeartPulseLine: ["IconHeartPulse", "HeartCheckIcon", "FavouriteIcon", "PulseIcon"],
  RiHomeLine: ["IconHome", "Home01Icon", "Home03Icon"],
  RiHospitalLine: ["IconHospital", "Hospital01Icon", "Hospital02Icon"],
  RiInboxLine: ["IconInbox", "InboxIcon", "Mail01Icon"],
  RiLayoutGridLine: ["IconGrid", "GridIcon", "LayoutGridIcon", "DashboardSquare01Icon"],
  RiLogoutBoxLine: ["IconLogout", "Logout01Icon", "Logout03Icon"],
  RiMailLine: ["IconMail", "Mail01Icon", "Mail02Icon"],
  RiMenuLine: ["IconMenu", "Menu01Icon", "Menu02Icon"],
  RiMoneyDollarCircleLine: ["IconBilling", "DollarCircleIcon", "MoneyBag02Icon", "Coins01Icon"],
  RiMoonLine: ["IconMoon", "Moon02Icon", "Moon01Icon"],
  RiMoreLine: ["IconMore", "MoreHorizontalIcon", "MoreHorizontalCircle01Icon"],
  RiNotification3Line: ["IconNotification", "Notification01Icon", "Notification03Icon"],
  RiPaletteLine: ["IconPalette", "PaintBoardIcon", "ColorsIcon", "PaintBrush01Icon"],
  RiPencilLine: ["IconEdit", "PencilEdit01Icon", "Edit02Icon", "PencilIcon"],
  RiPrinterLine: ["IconPrint", "PrinterIcon", "Printer01Icon"],
  RiPulseLine: ["IconPulse", "PulseIcon", "Activity01Icon", "Pulse01Icon"],
  RiRefreshLine: ["IconRefresh", "RefreshIcon", "ArrowReloadHorizontalIcon"],
  RiSearchLine: ["IconSearch", "Search01Icon", "SearchIcon"],
  RiSettings3Line: ["IconSettings", "Settings01Icon", "Settings02Icon"],
  RiShareLine: ["IconShare", "Share01Icon", "Share08Icon"],
  RiStethoscopeLine: ["IconStethoscope", "StethoscopeIcon", "Stethoscope02Icon"],
  RiSunLine: ["IconSun", "Sun01Icon", "Sun02Icon"],
  RiTableLine: ["IconTable", "Table01Icon", "TableIcon"],
  RiTeamLine: ["IconTeam", "UserGroupIcon", "UserMultipleIcon"],
  RiUserLine: ["IconUser", "User01Icon", "UserIcon"],

  // Added for the provider portal. Keys have no Remix counterpart; they only
  // need to be unique.
  X_Activity: ["IconActivity", "Activity01Icon"],
  X_ArrowLeft: ["IconArrowLeft", "ArrowLeft02Icon"],
  X_ArrowRight: ["IconArrowRight", "ArrowRight02Icon"],
  X_Attachment: ["IconAttachment", "FileAttachmentIcon"],
  X_CalendarAdd: ["IconCalendarAdd", "CalendarAdd01Icon"],
  X_CancelCircle: ["IconCancelCircle", "CancelCircleIcon"],
  X_CheckCircle: ["IconCheckCircle", "CheckmarkCircle02Icon"],
  X_Clipboard: ["IconClipboard", "ClipboardIcon"],
  X_Clock: ["IconClock", "Clock01Icon"],
  // The "System" choice in the appearance picker: follow the OS.
  X_Computer: ["IconComputer", "ComputerIcon", "Laptop01Icon"],
  X_CreditCard: ["IconCreditCard", "CreditCardIcon"],
  X_Dna: ["IconDna", "DnaIcon"],
  X_FileAlert: ["IconFileAlert", "FileRemoveIcon"],
  X_FileCheck: ["IconFileCheck", "FileVerifiedIcon"],
  X_Folder: ["IconFolder", "Folder01Icon"],
  X_History: ["IconHistory", "HistoryIcon"],
  X_Injection: ["IconInjection", "InjectionIcon"],
  X_Language: ["IconLanguage", "TranslateIcon"],
  X_ListView: ["IconListView", "LeftToRightListBulletIcon"],
  X_Location: ["IconLocation", "Location01Icon"],
  X_MoreVertical: ["IconMoreVertical", "MoreVerticalIcon"],
  X_Note: ["IconNote", "Note02Icon"],
  X_Percent: ["IconPercent", "PercentCircleIcon"],
  X_Phone: ["IconPhone", "Call02Icon", "CallIcon"],
  X_Pill: ["IconPill", "PillIcon"],
  X_PlayCircle: ["IconPlayCircle", "PlayCircleIcon"],
  X_Route: ["IconRoute", "Route01Icon"],
  X_Shield: ["IconShield", "Shield01Icon"],
  X_ShieldAlert: ["IconShieldAlert", "SecurityBlockIcon"],
  X_ShieldCheck: ["IconShieldCheck", "SecurityCheckIcon"],
  X_Upload: ["IconUpload", "Upload04Icon"],
  X_UserCircle: ["IconUserCircle", "UserCircleIcon"],
  X_Video: ["IconVideo", "Video01Icon"],

  // Call controls, for the virtual visit.
  X_Mic: ["IconMic", "Mic01Icon"],
  X_MicOff: ["IconMicOff", "MicOff01Icon"],
  X_VideoOff: ["IconVideoOff", "VideoOffIcon"],
  X_Speaker: ["IconSpeaker", "VolumeHighIcon"],
  X_SpeakerOff: ["IconSpeakerOff", "VolumeOffIcon"],
  X_ScreenShare: ["IconScreenShare", "ScreenShareIcon"],
  X_CallEnd: ["IconCallEnd", "CallEnd01Icon"],
  X_Message: ["IconMessage", "Message01Icon"],
  // A thumbtack, for pinning a speaker to the stage. Not the map pin —
  // IconLocation is a different idea and used as one elsewhere.
  X_Pin: ["IconPin", "Pin02Icon", "PinIcon"],

  // The patient portal: onboarding, consent and the pre-assessment forms. Each
  // question carries its own glyph, so the set leans on everyday, human shapes.
  X_Bookmark: ["IconBookmark", "Bookmark02Icon", "Bookmark01Icon"],
  X_Briefcase: ["IconBriefcase", "Briefcase01Icon"],
  X_Chat: ["IconChat", "BubbleChatIcon", "Comment01Icon"],
  X_ChatOff: ["IconChatOff", "MessageBlockedIcon"],
  X_Chatting: ["IconChatting", "Chatting01Icon", "MessageMultiple01Icon"],
  X_ChartUp: ["IconChartUp", "ChartUpIcon", "AnalyticsUpIcon"],
  X_Comment: ["IconComment", "Comment01Icon"],
  X_FirstAid: ["IconFirstAid", "FirstAidKitIcon"],
  X_Flash: ["IconFlash", "FlashIcon"],
  X_Flower: ["IconFlower", "FlowerIcon", "Flower01Icon"],
  X_GitBranch: ["IconGitBranch", "GitBranchIcon"],
  X_HandHeart: ["IconHandHeart", "HandHeartIcon", "GiveBloodIcon"],
  X_Handshake: ["IconHandshake", "HandshakeIcon", "Agreement02Icon"],
  X_Headset: ["IconHeadset", "HeadsetIcon", "CustomerSupportIcon"],
  X_Heart: ["IconHeart", "FavouriteIcon", "HeartIcon"],
  X_Heartbreak: ["IconHeartbreak", "HeartbreakIcon"],
  X_IdCard: ["IconIdCard", "IdentityCardIcon", "IdIcon"],
  X_Info: ["IconInfo", "InformationCircleIcon"],
  X_Lifebuoy: ["IconLifebuoy", "LifebuoyIcon", "HelpCircleIcon"],
  X_Lock: ["IconLock", "SquareLock02Icon", "LockIcon"],
  X_LockKey: ["IconLockKey", "LockKeyIcon"],
  X_LockOpen: ["IconLockOpen", "SquareUnlock02Icon", "LockOpenIcon"],
  X_Mountain: ["IconMountain", "MountainIcon"],
  X_Scale: ["IconScale", "JusticeScale01Icon", "BalanceScaleIcon"],
  X_Signature: ["IconSignature", "SignatureIcon"],
  X_Smile: ["IconSmile", "SmileIcon"],
  X_Sparkles: ["IconSparkles", "SparklesIcon"],
  X_Star: ["IconStar", "StarIcon"],
  X_Sunrise: ["IconSunrise", "SunriseIcon"],
  X_Switch: ["IconSwitch", "ArrowDataTransferHorizontalIcon", "Exchange01Icon"],
  X_Target: ["IconTarget", "Target02Icon", "Target01Icon"],
  X_ThumbsUp: ["IconThumbsUp", "ThumbsUpIcon"],
  X_Toolbox: ["IconToolbox", "ToolboxIcon"],
  X_TrendUp: ["IconTrendUp", "ChartIncreaseIcon"],
  X_UserAdd: ["IconUserAdd", "UserAdd01Icon"],
  X_UsersGroup: ["IconUsersGroup", "UserGroup03Icon", "UserGroupIcon"],
  X_Wave: ["IconWave", "WaveIcon"],
  // Dashboard: the WellQor Compass home screens.
  X_ArrowUpRight: ["IconArrowUpRight", "ArrowUpRight01Icon"],
  X_ArrowUp: ["IconArrowUp", "ArrowUp02Icon"],
  X_ArrowDown: ["IconArrowDown", "ArrowDown02Icon"],
  X_BadgeCheck: ["IconBadgeCheck", "CheckmarkBadge01Icon"],
  X_CalendarBlock: ["IconCalendarBlock", "CalendarBlock01Icon"],
  X_CalendarCheck: ["IconCalendarCheck", "CalendarCheckIn01Icon"],
  X_CalendarRemove: ["IconCalendarRemove", "CalendarRemove01Icon"],
  X_ChartColumn: ["IconChartColumn", "ChartColumnIcon"],
  X_FileUpload: ["IconFileUpload", "FileUploadIcon"],
  X_Megaphone: ["IconMegaphone", "Megaphone01Icon"],
  X_PhoneOutgoing: ["IconPhoneOutgoing", "CallOutgoing01Icon"],
  X_UserMinus: ["IconUserMinus", "UserMinus01Icon"],
  // Messages: SMS, group threads and the clinic mailbox.
  X_Archive: ["IconArchive", "Archive03Icon", "ArchiveIcon"],
  X_Send: ["IconSend", "SentIcon", "MailSend01Icon"],
  X_Reply: ["IconReply", "ReplyIcon", "MailReply01Icon"],
  X_ReplyAll: ["IconReplyAll", "ReplyAllIcon", "MailReplyAll01Icon"],
  X_Forward: ["IconForward", "ArrowTurnForwardIcon", "Forward01Icon"],
  X_Trash: ["IconTrash", "Delete02Icon"],
  X_MailOpen: ["IconMailOpen", "MailOpen01Icon"],
  X_MailAdd: ["IconMailAdd", "MailAdd01Icon"],
  X_Draft: ["IconDraft", "FileEditIcon", "MessageEdit01Icon"],
  X_Flag: ["IconFlag", "Flag02Icon"],
  X_TickDouble: ["IconTickDouble", "TickDouble02Icon"],
  X_PinOff: ["IconPinOff", "PinOffIcon"],
  X_BellOff: ["IconBellOff", "NotificationOff01Icon"],
  X_Copy: ["IconCopy", "Copy01Icon"],
  X_At: ["IconAt", "AtIcon"],
  X_Quote: ["IconQuote", "QuoteDownIcon"],
  X_Schedule: ["IconSchedule", "Clock04Icon", "AlarmClockIcon"],
  X_TaskAdd: ["IconTaskAdd", "TaskAdd01Icon"],
  X_Image: ["IconImage", "Image01Icon"],
  X_Undo: ["IconUndo", "Undo02Icon", "UndoIcon"],
  X_Link: ["IconLink", "Link01Icon"],
  X_Handoff: ["IconHandoff", "UserSwitchIcon"],
  X_Paperclip: ["IconPaperclip", "AttachmentIcon", "Attachment01Icon"],
}

const resolved = {}
const unresolved = []

for (const [remix, [exportName, ...candidates]] of Object.entries(MAP)) {
  const hit = candidates.find((c) => available.has(c))
  if (hit) {
    resolved[remix] = { exportName, hugeicon: hit }
  } else {
    unresolved.push({ remix, exportName, candidates })
  }
}

console.log(JSON.stringify({ resolved, unresolved }, null, 2))
console.error(
  `resolved ${Object.keys(resolved).length}/${Object.keys(MAP).length}; unresolved: ${unresolved
    .map((u) => u.remix)
    .join(", ") || "none"}`
)
fs.writeFileSync(
  `${SCRATCH}/icon-map.json`,
  JSON.stringify({ resolved, unresolved }, null, 2)
)
